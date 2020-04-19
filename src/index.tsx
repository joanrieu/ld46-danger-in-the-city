import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader, useThree } from "react-three-fiber";
import { Color, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carGltfUrl from "./car.glb";

const keys: Record<string, true> = {};
document.addEventListener("keydown", (event) => (keys[event.key] = true));
document.addEventListener("keyup", (event) => delete keys[event.key]);

function Car() {
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;
  const fixedStepSeconds = 0.001;
  const maxSteeringDelaySeconds = 0.4;
  const maxSteeringDelaySteps = maxSteeringDelaySeconds / fixedStepSeconds;
  const maxSteeringAngle = 0.0012;
  let leftoverTime = 0;
  let steeringSteps = 0;

  useFrame(({ camera }, delta) => {
    leftoverTime += delta;
    while (leftoverTime >= fixedStepSeconds) {
      leftoverTime -= fixedStepSeconds;

      if (keys.ArrowUp) car.translateZ(-15e-3);
      if (keys.ArrowDown) car.translateZ(15e-3);
      if (keys.ArrowLeft) ++steeringSteps;
      else if (keys.ArrowRight) --steeringSteps;
      else if (steeringSteps > 0) --steeringSteps;
      else if (steeringSteps < 0) ++steeringSteps;
      steeringSteps = Math.min(
        Math.max(steeringSteps, -maxSteeringDelaySteps),
        maxSteeringDelaySteps
      );
      car.rotateY((steeringSteps / maxSteeringDelaySteps) * maxSteeringAngle);

      const coef = 0.99;
      camera.position
        .multiplyScalar(coef)
        .addScaledVector(
          new Vector3(0, 2, 5)
            .applyQuaternion(car.quaternion)
            .add(car.position),
          1 - coef
        );
      camera.setRotationFromQuaternion(car.quaternion);
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

  const [pieces, setPieces] = useState<[number, number, number][]>([]);
  useEffect(() => {
    const coef = 2;
    const timeout = setTimeout(
      () =>
        setPieces(
          [...new Array((height / coef) | 0)].map((_, i) => [
            x + length * (Math.random() - 0.5),
            5 + i * coef,
            -y + length * (Math.random() - 0.5),
          ])
        ),
      2 * 60 * 1000 * Math.random()
    );
    return () => clearTimeout(timeout);
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
          <meshPhongMaterial attach="material" color={color} />
        </mesh>
      )}
      {pieces.map((position, i) => (
        <mesh
          key={"piece" + i}
          position={position}
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

function Game() {
  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 1, -2]} intensity={0.3} castShadow />
      <Car />
      <TowerGrid />
    </group>
  );
}

ReactDOM.render(
  <Canvas>
    <Suspense fallback={<group />}>
      <Game />
    </Suspense>
  </Canvas>,
  document.getElementById("game")
);
