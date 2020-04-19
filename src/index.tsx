import React, { Fragment, Suspense, useEffect } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader, useThree } from "react-three-fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carGltfUrl from "./car.glb";
import { Vector3 } from "three";

const keys: Record<string, true> = {};
document.addEventListener("keydown", (event) => (keys[event.key] = true));
document.addEventListener("keyup", (event) => delete keys[event.key]);

function Car() {
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;

  useFrame(() => {
    car.translateZ(-1);
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

function Game() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 1, -2]} intensity={0.3} />
      <Car />
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
