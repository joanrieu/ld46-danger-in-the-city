import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader } from "react-three-fiber";
import { Color, Vector3, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carGltfUrl from "./car.glb";

const keys: Record<string, true> = {};
document.addEventListener("keydown", (event) => (keys[event.key] = true));
document.addEventListener("keyup", (event) => delete keys[event.key]);

function Car() {
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;

  const fixedStepSeconds = 0.001;
  let leftoverTime = 0;

  const maxSteeringSeconds = 0.4;
  const maxSteeringSteps = maxSteeringSeconds / fixedStepSeconds;
  const maxSteeringAngle = 0.0012;
  let steeringSteps = 0;

  const maxSpeedSeconds = 3;
  const maxSpeedSteps = maxSpeedSeconds / fixedStepSeconds;
  const maxSpeed = 20e-3;
  let speedSteps = 0;

  useFrame(({ camera }, delta) => {
    leftoverTime += delta;
    while (leftoverTime >= fixedStepSeconds) {
      leftoverTime -= fixedStepSeconds;

      if (keys.ArrowUp && speedSteps < maxSpeedSteps) ++speedSteps;
      else if (keys.ArrowDown && speedSteps > -maxSpeedSteps / 10)
        speedSteps -= 3;
      else if (speedSteps > 0) speedSteps -= 0.3;
      else if (speedSteps < 0) speedSteps += 0.3;
      car.translateZ(-(speedSteps / maxSpeedSteps) * maxSpeed);

      if (keys.ArrowLeft && steeringSteps < maxSteeringSteps) ++steeringSteps;
      else if (keys.ArrowRight && steeringSteps > -maxSteeringSteps)
        --steeringSteps;
      else if (steeringSteps > 0) --steeringSteps;
      else if (steeringSteps < 0) ++steeringSteps;

      car.rotateY(
        (steeringSteps / maxSteeringSteps) *
          maxSteeringAngle *
          Math.min(1, speedSteps / (maxSpeedSteps / 10))
      );

      const coef = 0.99;
      camera.position
        .multiplyScalar(coef)
        .addScaledVector(
          new Vector3(-2 * (1 - speedSteps / maxSpeedSteps), 1, 3)
            .applyQuaternion(car.quaternion)
            .add(car.position),
          1 - coef
        );
      camera.setRotationFromQuaternion(car.quaternion);
      camera.rotateY(-(Math.PI / 6) * (1 - speedSteps / maxSpeedSteps));
    }
  });

  return <primitive object={car} dispose={null} />;
}

function Tower({
  position: [x, y],
  length,
}: {
  position: [number, number];
  length: number;
}) {
  const [height] = useState(() => Math.random() * 30 + 5);
  const [color] = useState(() =>
    new Color(
      32 + 5 * Math.round(4 * Math.random()),
      21 + 5 * Math.round(4 * Math.random()),
      78 + 5 * Math.round(4 * Math.random())
    ).multiplyScalar(1 / 255)
  );

  const [pieces, setPieces] = useState<
    { position: [number, number, number]; mesh?: Mesh | null }[]
  >([]);
  useEffect(() => {
    if (pieces.length === 0) {
      const coef = 2;
      const timeout = setTimeout(
        () =>
          setPieces(
            [...new Array((height / coef) | 0)].map((_, i) => ({
              position: [
                x + length * (Math.random() - 0.5),
                5 + i * coef,
                -y + length * (Math.random() - 0.5),
              ],
            }))
          ),
        2 * 60 * 1000 * Math.random()
      );
      return () => clearTimeout(timeout);
    }
  }, [pieces]);

  useFrame((state, delta) => {
    for (const piece of pieces) {
      const mesh = piece.mesh;
      if (mesh) {
        if (mesh.position.y > mesh.scale.y)
          mesh.translateY((-15 * delta) / Math.max(1, mesh.position.y / 10));
        if (mesh.position.y < mesh.scale.y) mesh.position.y = mesh.scale.y;
      }
    }
  });

  return (
    <group>
      {!pieces.length && (
        <mesh
          key="tower"
          position={[x, height / 2, -y]}
          scale={[length, height, length]}
        >
          <boxBufferGeometry attach="geometry" />
          <meshToonMaterial
            attach="material"
            color={color}
            specular={new Color("orange")}
            shininess={10}
          />
        </mesh>
      )}
      {pieces.map((piece, i) => (
        <mesh
          ref={(mesh) => (piece.mesh = mesh)}
          key={"piece" + i}
          position={piece.position}
          scale={new Vector3(3, 4, 5)}
        >
          <dodecahedronBufferGeometry attach="geometry" />
          <meshPhongMaterial attach="material" color={color} />
        </mesh>
      ))}
    </group>
  );
}

function TowerGrid() {
  const [diameter] = useState(() => (17 + 5 * Math.random()) | 1);
  const [buildingSize] = useState(() => 20 + 10 * Math.random());
  const [roadSize] = useState(() => 10 + 5 * Math.random());
  return (
    <group>
      {[...new Array(diameter)].map((_, y) =>
        [...new Array(diameter)].map((_, x) => (
          <Tower
            key={[x, y].toString()}
            position={[
              (x - diameter / 2) * (buildingSize + roadSize),
              (y - diameter / 2) * (buildingSize + roadSize),
            ]}
            length={buildingSize}
          />
        ))
      )}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeBufferGeometry attach="geometry" args={[200, 200]} />
      <shadowMaterial attach="material" color="red" />
    </mesh>
  );
}

function Game() {
  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 0, -1]} intensity={0.3} />
      <Car />
      <TowerGrid />
      <Ground />
    </group>
  );
}

ReactDOM.render(
  <Canvas concurrent>
    <Suspense fallback={<group />}>
      <Game />
    </Suspense>
  </Canvas>,
  document.getElementById("game")
);
