import React, { Fragment, Suspense, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader, useThree } from "react-three-fiber";
import { Vector3, Color } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carGltfUrl from "./car.glb";

const keys: Record<string, true> = {};
document.addEventListener("keydown", (event) => (keys[event.key] = true));
document.addEventListener("keyup", (event) => delete keys[event.key]);

function Car() {
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;

  useFrame(() => {
    if (keys.ArrowUp) car.translateZ(-1);
    if (keys.ArrowDown) car.translateZ(1);
    if (keys.ArrowLeft) car.rotateY(Math.PI / 100);
    if (keys.ArrowRight) car.rotateY(-Math.PI / 100);

    const coef = 0.7;
    camera.position
      .multiplyScalar(coef)
      .addScaledVector(
        new Vector3(0, 2, 5).applyQuaternion(car.quaternion).add(car.position),
        1 - coef
      );
    camera.lookAt(car.position.clone().add(new Vector3(0, 1, 0)));
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
  return (
    <mesh position={[x, height / 2, -y]} scale={[length, height, length]}>
      <boxBufferGeometry attach="geometry" />
      <meshPhongMaterial attach="material" color={color} />
    </mesh>
  );
}

function TowerGrid() {
  const diameter = 17;
  const buildingSize = 30;
  const roadSize = 15;
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
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 1, -2]} intensity={0.3} />
      <Car />
      <TowerGrid />
    </>
  );
}

ReactDOM.render(
  <Canvas>
    <Suspense fallback={<Fragment />}>
      <Game />
    </Suspense>
  </Canvas>,
  document.getElementById("game")
);
