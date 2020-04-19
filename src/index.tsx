import React, { Fragment, Suspense, useEffect } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader, useThree } from "react-three-fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carUrl from "./car.glb";

function Car() {
  const gltf = useLoader(GLTFLoader, carUrl);
  useFrame(() => {
    gltf.scene.rotateY(Math.PI / 100);
  });
  return <primitive object={gltf.scene} dispose={null} />;
}

function Game() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.y = 1;
  }, [camera]);
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
