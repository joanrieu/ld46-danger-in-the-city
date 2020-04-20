import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas, useFrame, useLoader, useResource } from "react-three-fiber";
import { Color, Geometry, Group, Material, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import carGltfUrl from "./car.glb";

const keys: Record<string, true> = {};
document.addEventListener("keydown", (event) => (keys[event.key] = true));
document.addEventListener("keyup", (event) => delete keys[event.key]);

function Car({ onDead }: { onDead: () => void }) {
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;

  // COLLISIONS

  const [colliding, setColliding] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const towers =
        car.parent?.children.find((o) => o.children.length > 100)?.children ||
        [];
      const collision = towers
        .filter(
          (t) => t.children[0].position.manhattanDistanceTo(car.position) < 100
        )
        .flatMap((t) => t.children)
        .find((o) => {
          if (o.name === "tower") {
            const diff = o.position.clone().sub(car.position);
            const d1 = Math.abs(diff.x);
            const d2 = Math.abs(diff.z);
            const carSize = 2;
            return (
              d1 < (o.scale.x + carSize) / 2 && d2 < (o.scale.z + carSize) / 2
            );
          }
          return o.position.manhattanDistanceTo(car.position) < 7;
        });
      if (collision) {
        setColliding(true);
        onDead();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [car]);

  // PHYSICS

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
    if (colliding) {
      car.rotateX(-delta * (Math.PI / 12));
      return;
    }

    leftoverTime += delta;
    while (leftoverTime >= fixedStepSeconds) {
      leftoverTime -= fixedStepSeconds;

      // ACCELERATION

      if (keys.ArrowUp && speedSteps < maxSpeedSteps) ++speedSteps;
      else if (keys.ArrowDown && speedSteps > -maxSpeedSteps / 10)
        speedSteps -= 3;
      else if (speedSteps > 0) speedSteps -= 0.3;
      else if (speedSteps < 0) speedSteps += 0.3;
      car.translateZ(-(speedSteps / maxSpeedSteps) * maxSpeed);

      // STEERING

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

      // CAMERA

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
    {
      position: [number, number, number];
      direction: [number, number];
      mesh?: Mesh | null;
    }[]
  >([]);
  useEffect(() => {
    if (pieces.length === 0) {
      const coef = 2;
      const timeout = setTimeout(
        () =>
          setPieces(
            [...new Array((height / coef) | 0)].map((_, i) => ({
              position: [
                x + length * (Math.random() - 0.5) * 1.5,
                5 + i * coef,
                -y + length * (Math.random() - 0.5) * 1.5,
              ],
              direction: [Math.random() * 2 - 1, Math.random() * 2 - 1],
            }))
          ),
        30 * 1000 * Math.random()
      );
      return () => clearTimeout(timeout);
    }
  }, [pieces]);

  let active = true;
  useFrame((state, delta) => {
    if (!active) return;
    active = false;
    for (const piece of pieces) {
      const mesh = piece.mesh;
      if (mesh) {
        if (mesh.position.y > mesh.scale.y) {
          mesh.translateY((-15 * delta) / Math.max(1, mesh.position.y / 10));
          mesh.translateX(delta * 15 * piece.direction[0]);
          mesh.translateZ(delta * 15 * piece.direction[1]);
          active = true;
        }
        if (mesh.position.y < mesh.scale.y) mesh.position.y = mesh.scale.y;
      }
    }
  });

  const [pieceGeometryRef, pieceGeometry] = useResource<Geometry>();
  const [pieceMaterialRef, pieceMaterial] = useResource<Material>();

  return (
    <group>
      {!pieces.length && (
        <mesh
          name="tower"
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
      <dodecahedronBufferGeometry ref={pieceGeometryRef} />
      <meshPhongMaterial ref={pieceMaterialRef} color={color} />
      {pieces.map((piece, i) => (
        <mesh
          ref={(mesh) => (piece.mesh = mesh)}
          key={"piece" + i}
          position={piece.position}
          scale={[
            3 + 2 * Math.random(),
            3 + 2 * Math.random(),
            3 + 2 * Math.random(),
          ]}
          rotation-y={Math.random() * Math.PI}
          material={pieceMaterial}
          geometry={pieceGeometry}
        />
      ))}
    </group>
  );
}

function TowerGrid() {
  const diameter = 25;
  const buildingSize = 20;
  const roadSize = 10;
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

function Game({ onDead }: { onDead: () => void }) {
  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 0, -1]} intensity={0.3} />
      <directionalLight position={[0, 0, 1]} intensity={0.1} />
      <Car onDead={onDead} />
      <TowerGrid />
      <Ground />
    </group>
  );
}

function Hud() {
  const [timer, setTimer] = useState(30);
  useEffect(() => {
    if (timer > 0) {
      const timeout = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(timeout);
    }
  }, [timer]);
  return (
    <svg
      viewBox="0 0 434 257"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        placeSelf: "end start",
        width: "30%",
        background: "#ffffff33",
        transform: "translateZ(-30vmin) rotateY(30deg) rotateX(30deg)",
        mixBlendMode: "luminosity",
      }}
    >
      <text
        fontWeight="bold"
        textAnchor="start"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="216"
        y="204"
        x="52"
        strokeWidth="8"
        stroke="#7AD6CA"
        fill="#0E353B"
      >
        {timer.toString().padStart(2, "0")}&Prime;
      </text>
    </svg>
  );
}

function DeathSplash() {
  return (
    <div
      id="deathsplash"
      style={{
        width: "50vmin",
        height: "50vmin",
        placeSelf: "center",
        backgroundImage: "radial-gradient(orange, yellow, red, red)",
        transform: "scale(0)",
        borderRadius: "100%",
        animation: "deathsplash 2s",
      }}
    >
      <style>{`
        @keyframes deathsplash {
          from { transform: scale(1e-1); opacity: 1; }
          to { transform: scale(1e2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

type ScreenProps = {
  setScreen: (screen: () => (props: ScreenProps) => JSX.Element) => void;
};

function GameScreen({ setScreen }: ScreenProps) {
  const [dead, setDead] = useState(false);
  useEffect(() => {
    if (dead) {
      const timeout = setTimeout(() => {
        setScreen(() => TitleScreen);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  });
  return (
    <>
      <Canvas concurrent>
        <Suspense fallback={<group />}>
          <Game onDead={() => setDead(true)} />
        </Suspense>
      </Canvas>
      {!dead && <Hud />}
      {dead && <DeathSplash />}
    </>
  );
}

function TitleScreenCar() {
  const gltf = useLoader(GLTFLoader, carGltfUrl);
  const car = gltf.scene;
  car.position.set(0, 0, 0);
  car.rotation.set(0, 0, 0);
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 3, 1]} />
      <group
        position={[-3, -1.5, 1]}
        ref={(g: Group | null) => g?.lookAt(-20, -2, -10)}
      >
        <primitive object={car} dispose={null} />
      </group>
    </Canvas>
  );
}

function TitleScreen({ setScreen }: ScreenProps) {
  return (
    <>
      <Suspense fallback={<div />}>
        <TitleScreenCar />
      </Suspense>
      <div
        style={{
          fontSize: "15vmin",
          color: "#222",
          textShadow: "0 0 1vmin white",
          textAlign: "center",
          placeSelf: "center",
          mixBlendMode: "luminosity",
          transform: "rotateY(-20deg) translateX(15vmin) rotateX(10deg)",
        }}
      >
        <div style={{ fontSize: "18vmin" }}>Danger</div>
        in the City
        <button
          autoFocus
          onClick={() => setScreen(() => GameScreen)}
          style={{
            fontSize: "7vmin",
            fontWeight: "bold",
            padding: "2vmin 5vmin",
            background: "#ffffffcc",
            borderRadius: "1vmin",
            display: "block",
            margin: "5vmin auto",
            outline: "none",
          }}
        >
          Play
        </button>
      </div>
    </>
  );
}

function App() {
  const [Screen, setScreen] = useState(() => TitleScreen);
  return <Screen setScreen={setScreen} />;
}

ReactDOM.render(<App />, document.getElementById("game"));
