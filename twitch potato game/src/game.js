import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs, setDoc, doc, getDoc, deleteDoc, where } from "firebase/firestore";
const Matter = window.Matter;
import decomp from 'poly-decomp';
Matter.Common.setDecomp(decomp);

let userId = "test";  // Hardcoded user ID
let streamerId = "test";    // Hardcoded streamer ID
let user_name = "";
let lastDropTime = 0;
const styleFixGameOver = `
#game-end-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
}

#game-end {
  text-align: center;
  padding: 20px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  max-width: 80%;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = styleFixGameOver;
document.head.appendChild(styleElement);

// Listen for Twitch authorization
function waitForTwitchAuthorization() {
  return new Promise((resolve, reject) => {
    // Check if we're running in the Twitch environment
    if (typeof Twitch !== 'undefined' && Twitch.ext) {
      Twitch.ext.onAuthorized((auth) => {
        console.log('The extension is now authorized.');
        console.log(`Authorized User ID: ${auth.userId}, Channel ID: ${auth.channelId}`);
        userId = auth.userId;
        streamerId = auth.channelId;
        resolve({
          userId: auth.userId,
          channelId: auth.channelId
        });
      });
    } else {
      // Fallback for local testing
      console.log('Twitch extension environment not detected, using test values');
      userId = "test";
      streamerId = "test";
      resolve({
        userId: "test",
        channelId: "test"
      });
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializeGame() {
  try {
      const auth = await waitForTwitchAuthorization();
      console.log(`Initializing game for User ID: ${auth.userId} and Channel ID: ${auth.channelId}`);
      // Initialize your game logic here
  } catch (error) {
      console.error("Failed to initialize the game due to authorization issues:", error);
  }
}

// Game constants
const GAME = {
  WIDTH: 320,
  HEIGHT: 455,
  LOSE_HEIGHT: 0,
  PREVIEW_HEIGHT: 0,
  STATES: {
    MENU: 0,
    READY: 1,
    DROP: 2,
    PAUSE: 3,
    LOSE: 4
  }
};

// Physics properties
const PHYSICS = {
  FRICTION: 0.006,
  FRICTION_STATIC: 0.006,
  FRICTION_AIR: 0,
  RESTITUTION: 0.1
};

// Define vegetable shapes
const SHAPES = {
  // eggplant shape
  eggplant: [
    { x: 4.63, y: -30.64 },
    { x: 7.97, y: -29.17 },
    { x: 11.18, y: -26.5 },
    { x: 13.32, y: -21.55 },
    { x: 13.98, y: -18.75 },
    { x: 15.99, y: -16.88 },
    { x: 15.59, y: -13.94 },
    { x: 17.59, y: -4.7 },
    { x: 20.94, y: 5.72 },
    { x: 22.94, y: 15.08 },
    { x: 22.41, y: 22.7 },
    { x: 19.87, y: 29.52 },
    { x: 14.39, y: 35.67 },
    { x: 6.36, y: 39.28 },
    { x: 0, y: 39.87 },
    { x: 0, y: 39.87 },
    { x: -4.82, y: 39.33 },
    { x: -12.71, y: 36.66 },
    { x: -18.06, y: 31.57 },
    { x: -21.94, y: 24.08 },
    { x: -23.01, y: 14.85 },
    { x: -21, y: 6.15 },
    { x: -17.66, y: -5.08 },
    { x: -15.65, y: -14.45 },
    { x: -16.45, y: -16.45 },
    { x: -13.91, y: -19.26 },
    { x: -11.51, y: -25.55 },
    { x: -8.16, y: -29.03 },
    { x: -4.41, y: -30.64 },
    { x: -6.02, y: -35.32 },
    { x: -5.35, y: -37.73 },
    { x: -1.2, y: -39.6 },
    { x: 3.88, y: -38.66 },
    { x: 5.22, y: -36.12 }
  ],
  
  // Bell pepper shape
  pepper: [
    { x: -4.48, y: 40.34 },
    { x: -10.36, y: 38.69 },
    { x: -14.69, y: 35.18 },
    { x: -17.48, y: 30.02 },
    { x: -19.85, y: 24.86 },
    { x: -21.4, y: 20.32 },
    { x: -22.43, y: 14.85 },
    { x: -23.98, y: 10.73 },
    { x: -24.39, y: 4.85 },
    { x: -25.11, y: 0.31 },
    { x: -25.01, y: -4.85 },
    { x: -25.11, y: -9.91 },
    { x: -23.57, y: -14.76 },
    { x: -20, y: -20 },
    { x: -15, y: -20.74 },
    { x: -10.15, y: -23.11 },
    { x: -5.1, y: -24.66 },
    { x: -4.89, y: -29.92 },
    { x: -0.04, y: -35.18 },
    { x: 5.01, y: -39.93 },
    { x: 10.07, y: -38.18 },
    { x: 13.78, y: -34.88 },
    { x: 10, y: -30 },
    { x: 7.8, y: -25.28 },
    { x: 15.02, y: -21.36 },
    { x: 20, y: -20 },
    { x: 25.24, y: -15.07 },
    { x: 26.89, y: -10.01 },
    { x: 26.68, y: -5.06 },
    { x: 26.47, y: 0 },
    { x: 25.96, y: 4.74 },
    { x: 25.34, y: 10.01 },
    { x: 24.41, y: 15.16 },
    { x: 22.76, y: 20.32 },
    { x: 21.06, y: 24.95 },
    { x: 18.7, y: 30.38 },
    { x: 16.16, y: 34.91 },
    { x: 10, y: 40 },
    { x: 4.57, y: 39.62 },
    { x: 0.77, y: 36.91 }
  ],

  // hitbox6 shape
  hitbox6: [
    { x: 0.08, y: 39.81 },
    { x: 8.76, y: 38.66 },
    { x: 16.66, y: 34.92 },
    { x: 20.13, y: 30.77 },
    { x: 22.68, y: 27.69 },
    { x: 24.15, y: 24.08 },
    { x: 25.35, y: 18.33 },
    { x: 25.75, y: 9.23 },
    { x: 24.95, y: 0.13 },
    { x: 23.08, y: -8.43 },
    { x: 19.2, y: -18.46 },
    { x: 15.85, y: -22.88 },
    { x: 19.46, y: -23.95 },
    { x: 23.61, y: -23.95 },
    { x: 25.48, y: -26.76 },
    { x: 22.27, y: -31.57 },
    { x: 17.19, y: -33.31 },
    { x: 13.18, y: -32.91 },
    { x: 11.97, y: -37.99 },
    { x: 8.63, y: -39.73 },
    { x: 5.55, y: -38.53 },
    { x: 3.68, y: -33.58 },
    { x: 1.27, y: -37.19 },
    { x: -1.81, y: -36.79 },
    { x: -3.81, y: -33.58 },
    { x: -6.35, y: -39.2 },
    { x: -9.83, y: -39.33 },
    { x: -13.04, y: -35.99 },
    { x: -13.31, y: -32.91 },
    { x: -20.8, y: -32.24 },
    { x: -24.68, y: -28.36 },
    { x: -23.88, y: -24.35 },
    { x: -17.46, y: -23.41 },
    { x: -16.01, y: -22.21 },
    { x: -18.77, y: -18.47 },
    { x: -22.91, y: -10.59 },
    { x: -24.65, y: -0.29 },
    { x: -25.72, y: 14.41 },
    { x: -23.58, y: 25.11 },
    { x: -18.64, y: 32.73 },
    { x: -12.75, y: 37.41 },
    { x: -2.73, y: 39.68 }
  ],

  // hitbox7 shape
  hitbox7: [
    { x: 0.21, y: 39.28 },
    { x: 6.63, y: 39.01 },
    { x: 13.98, y: 36.07 },
    { x: 18.66, y: 31.39 },
    { x: 21.2, y: 25.9 },
    { x: 22.14, y: 19.75 },
    { x: 21.2, y: 14 },
    { x: 19.2, y: 7.06 },
    { x: 18.66, y: 3.18 },
    { x: 20.94, y: -3.9 },
    { x: 22.54, y: -10.85 },
    { x: 22.94, y: -18.07 },
    { x: 21.34, y: -25.83 },
    { x: 19.33, y: -28.77 },
    { x: 16.52, y: -26.76 },
    { x: 13.18, y: -33.18 },
    { x: 9.3, y: -37.59 },
    { x: 4.76, y: -39.86 },
    { x: -1.39, y: -36.26 },
    { x: -5.67, y: -38.39 },
    { x: -11.02, y: -35.99 },
    { x: -14.36, y: -31.98 },
    { x: -16.63, y: -24.49 },
    { x: -19.3, y: -28.77 },
    { x: -21.44, y: -25.96 },
    { x: -22.25, y: -20.75 },
    { x: -23.05, y: -15.4 },
    { x: -22.38, y: -9.92 },
    { x: -20.51, y: -2.7 },
    { x: -18.24, y: 1.85 },
    { x: -18.1, y: 5.46 },
    { x: -19.71, y: 11.74 },
    { x: -21.18, y: 17.76 },
    { x: -21.31, y: 24.31 },
    { x: -19.71, y: 28.85 },
    { x: -16.23, y: 34.87 },
    { x: -12.62, y: 37.01 },
    { x: -6.87, y: 38.74 }
  ],

  // hitbox8 shape
  hitbox8: [
    { x: 0.21, y: 39.55 },
    { x: 8.5, y: 39.01 },
    { x: 13.85, y: 37.14 },
    { x: 15.86, y: 34.86 },
    { x: 16.52, y: 32.86 },
    { x: 17.46, y: 24.7 },
    { x: 17.73, y: 17.75 },
    { x: 18.8, y: 12.41 },
    { x: 22.94, y: 14.41 },
    { x: 27.89, y: 13.48 },
    { x: 31.5, y: 11.2 },
    { x: 32.57, y: 9.33 },
    { x: 35.64, y: 7.73 },
    { x: 38.45, y: 2.78 },
    { x: 38.98, y: -0.56 },
    { x: 38.72, y: -5.77 },
    { x: 36.84, y: -10.72 },
    { x: 33.64, y: -13.66 },
    { x: 31.1, y: -15.13 },
    { x: 29.22, y: -23.42 },
    { x: 24.95, y: -28.77 },
    { x: 19.6, y: -31.44 },
    { x: 16.93, y: -32.51 },
    { x: 9.84, y: -37.46 },
    { x: 4.36, y: -39.33 },
    { x: 0.08, y: -39.86 },
    { x: -7.54, y: -38.53 },
    { x: -13.56, y: -35.72 },
    { x: -16.76, y: -32.24 },
    { x: -23.05, y: -29.97 },
    { x: -26.26, y: -27.16 },
    { x: -28.93, y: -23.82 },
    { x: -30.53, y: -19.54 },
    { x: -31.2, y: -14.73 },
    { x: -36.28, y: -11.26 },
    { x: -38.56, y: -6.84 },
    { x: -39.49, y: -1.63 },
    { x: -38.16, y: 3.32 },
    { x: -35.35, y: 7.6 },
    { x: -32.01, y: 9.73 },
    { x: -30, y: 12.41 },
    { x: -25.59, y: 14.55 },
    { x: -18.9, y: 12.41 },
    { x: -17.97, y: 15.08 },
    { x: -17.3, y: 22.84 },
    { x: -16.5, y: 32.19 },
    { x: -15.43, y: 35.94 },
    { x: -11.95, y: 38.08 },
    { x: -5.94, y: 39.68 }
  ],

  // hitbox9 shape
  hitbox9: [
    { x: -11.28, y: 35.14 },
    { x: -4.73, y: 36.74 },
    { x: -0.05, y: 37 },
    { x: 6.5, y: 36.47 },
    { x: 11.31, y: 34.99 },
    { x: 18.8, y: 34.06 },
    { x: 25.35, y: 31.12 },
    { x: 27.35, y: 28.99 },
    { x: 34.04, y: 25.11 },
    { x: 37.91, y: 18.56 },
    { x: 39.52, y: 11.61 },
    { x: 39.52, y: 4.79 },
    { x: 38.72, y: 0.64 },
    { x: 37.91, y: -1.5 },
    { x: 35.78, y: -7.24 },
    { x: 32.03, y: -12.06 },
    { x: 27.75, y: -15.8 },
    { x: 23.07, y: -18.88 },
    { x: 16.52, y: -19.81 },
    { x: 11.84, y: -22.08 },
    { x: 6.9, y: -22.48 },
    { x: 6.36, y: -29.17 },
    { x: 3.16, y: -34.78 },
    { x: -1.66, y: -37.06 },
    { x: -5.94, y: -35.05 },
    { x: -7.54, y: -31.71 },
    { x: -7.01, y: -28.5 },
    { x: -2.99, y: -25.03 },
    { x: -2.46, y: -22.62 },
    { x: -4.87, y: -21.82 },
    { x: -9.81, y: -22.62 },
    { x: -14.89, y: -21.01 },
    { x: -17.03, y: -19.28 },
    { x: -23.32, y: -18.21 },
    { x: -29.2, y: -14.33 },
    { x: -34.55, y: -8.58 },
    { x: -38.02, y: -2.16 },
    { x: -39.63, y: 5.99 },
    { x: -39.63, y: 13.61 },
    { x: -36.68, y: 21.23 },
    { x: -32.67, y: 26.45 },
    { x: -27.86, y: 28.58 },
    { x: -22.91, y: 32.6 },
    { x: -15.56, y: 35 }
  ],

  // hitbox10 shape
  hitbox10: [
    { x: -0.59, y: -39.73 },
    { x: 3.82, y: -39.6 },
    { x: 12.25, y: -37.86 },
    { x: 21.47, y: -32.78 },
    { x: 26.82, y: -26.37 },
    { x: 29.49, y: -20.62 },
    { x: 31.9, y: -12.47 },
    { x: 34.57, y: -4.57 },
    { x: 37.65, y: 2.92 },
    { x: 39.39, y: 11.61 },
    { x: 37.38, y: 21.63 },
    { x: 32.3, y: 28.85 },
    { x: 25.61, y: 34.33 },
    { x: 18.13, y: 37.14 },
    { x: 10.78, y: 38.61 },
    { x: 2.49, y: 39.68 },
    { x: -7.54, y: 38.48 },
    { x: -15.83, y: 35.94 },
    { x: -20.37, y: 33.66 },
    { x: -27.73, y: 27.25 },
    { x: -32.14, y: 21.37 },
    { x: -36.28, y: 15.08 },
    { x: -37.89, y: 8.53 },
    { x: -39.09, y: 2.25 },
    { x: -39.36, y: -3.1 },
    { x: -38.16, y: -10.59 },
    { x: -35.61, y: -17.4 },
    { x: -31.47, y: -23.96 },
    { x: -27.33, y: -28.5 },
    { x: -22.91, y: -31.98 },
    { x: -18.64, y: -34.38 },
    { x: -11.55, y: -37.59 },
    { x: -4.33, y: -39.46 }
  ],
  
  // tomato shape
  tomato: [
    { x: -0.05, y: 39.68 },
    { x: 8.5, y: 39.14 },
    { x: 16.93, y: 37.27 },
    { x: 25.61, y: 32.19 },
    { x: 33.5, y: 24.03 },
    { x: 38.18, y: 15.08 },
    { x: 38.98, y: 3.98 },
    { x: 36.98, y: -5.24 },
    { x: 32.57, y: -13.39 },
    { x: 25.35, y: -20.48 },
    { x: 20.27, y: -23.82 },
    { x: 21.34, y: -25.83 },
    { x: 18.66, y: -28.77 },
    { x: 13.18, y: -30.51 },
    { x: 8.1, y: -29.97 },
    { x: 5.96, y: -29.04 },
    { x: 4.63, y: -33.98 },
    { x: 1.02, y: -39.73 },
    { x: -2.99, y: -35.85 },
    { x: -3.26, y: -28.37 },
    { x: -9.95, y: -30.77 },
    { x: -16.9, y: -29.84 },
    { x: -21.98, y: -25.83 },
    { x: -17.7, y: -23.02 },
    { x: -28.4, y: -18.07 },
    { x: -33.48, y: -12.06 },
    { x: -37.62, y: -3.63 },
    { x: -38.96, y: 6.93 },
    { x: -37.49, y: 16.02 },
    { x: -34.28, y: 22.7 },
    { x: -29.33, y: 28.45 },
    { x: -23.05, y: 33.93 },
    { x: -15.56, y: 37.68 },
    { x: -7.54, y: 39.55 }
  ],
  
  // Carrot shape
  carrot: [
    { x: 1.23, y: 40 },
    { x: 10.44, y: 35.21 },
    { x: 16.22, y: 24.89 },
    { x: 18.97, y: 9.9 },
    { x: 17.31, y: -0.17 },
    { x: 11.37, y: -7.55 },
    { x: 7.46, y: -9.58 },
    { x: 18, y: -20.02 },
    { x: 19.34, y: -28.29 },
    { x: 16.66, y: -32.31 },
    { x: 12.25, y: -36.88 },
    { x: 6.26, y: -36.17 },
    { x: 0, y: -40 },
    { x: -7.69, y: -36.96 },
    { x: -15.17, y: -37.67 },
    { x: -19.66, y: -31.52 },
    { x: -15, y: -20 },
    { x: -6.11, y: -9.3 },
    { x: -11.15, y: -6.31 },
    { x: -15.96, y: -0.08 },
    { x: -17.3, y: 9.85 },
    { x: -15, y: 25 },
    { x: -9.02, y: 35.14 }
  ],
  
  // onion shape
  onion: [
    { x: -0.55, y: 38.34 },
    { x: 1.32, y: 38.74 },
    { x: 3.16, y: 39.41 },
    { x: 4.76, y: 38.07 },
    { x: 7.43, y: 36.47 },
    { x: 12.91, y: 34.86 },
    { x: 18.93, y: 32.05 },
    { x: 24.01, y: 27.92 },
    { x: 28.29, y: 22.57 },
    { x: 30.96, y: 16.29 },
    { x: 31.76, y: 9.47 },
    { x: 31.23, y: 2.78 },
    { x: 28.96, y: -2.97 },
    { x: 25.21, y: -9.38 },
    { x: 20.4, y: -13.93 },
    { x: 14.79, y: -17.4 },
    { x: 10.91, y: -19.54 },
    { x: 8.64, y: -21.82 },
    { x: 9.57, y: -24.22 },
    { x: 15.19, y: -23.96 },
    { x: 13.32, y: -27.16 },
    { x: 10.11, y: -29.3 },
    { x: 15.72, y: -31.04 },
    { x: 19.73, y: -33.05 },
    { x: 14.79, y: -34.52 },
    { x: 7.97, y: -33.18 },
    { x: 11.18, y: -36.26 },
    { x: 15.32, y: -39.2 },
    { x: 12.25, y: -39.6 },
    { x: 5.03, y: -36.79 },
    { x: -0.45, y: -31.44 },
    { x: -4.33, y: -32.91 },
    { x: -8.07, y: -29.7 },
    { x: -4.47, y: -28.9 },
    { x: -4.2, y: -26.23 },
    { x: -5, y: -22.35 },
    { x: -8.61, y: -19.41 },
    { x: -12.89, y: -17.67 },
    { x: -18.24, y: -14.6 },
    { x: -21.84, y: -12.06 },
    { x: -25.59, y: -7.78 },
    { x: -28.66, y: -3.1 },
    { x: -30.27, y: 0.11 },
    { x: -31.34, y: 5.46 },
    { x: -31.6, y: 10.14 },
    { x: -31.07, y: 16.15 },
    { x: -29.06, y: 20.96 },
    { x: -25.72, y: 25.78 },
    { x: -21.58, y: 30.06 },
    { x: -16.63, y: 33.13 },
    { x: -10.75, y: 35.54 },
    { x: -6.34, y: 37.81 },
    { x: -4.33, y: 39.68 }
  ]
};

// Define vegetable types and their properties
const VEGETABLES = [
  { radius: 24, scoreValue: 1, img: 'circle0.webp', color: '#8E44AD', shape: 'eggplant', scaleX: 1, scaleY: 1 }, 
  { radius: 32, scoreValue: 3, img: 'circle1.webp', color: '#F1C40F', shape: 'circle', scaleX: 1, scaleY: 1 },
  { radius: 40, scoreValue: 6, img: 'circle2.webp', color: '#2ECC71', shape: 'tomato', scaleX: 1, scaleY: 1 },
  { radius: 48, scoreValue: 10, img: 'circle3.webp', color: '#E74C3C', shape: 'pepper', scaleX: 1, scaleY: 1 },
  { radius: 56, scoreValue: 15, img: 'circle4.webp', color: '#F39C12', shape: 'carrot', scaleX: 1, scaleY: 1 },
  { radius: 64, scoreValue: 21, img: 'circle5.webp', color: '#ECF0F1', shape: 'onion', scaleX: 1, scaleY: 1},
  { radius: 72, scoreValue: 28, img: 'circle6.webp', color: '#3498DB', shape: 'hitbox6', scaleX: 1, scaleY: 1 },
  { radius: 80, scoreValue: 36, img: 'circle7.webp', color: '#1ABC9C', shape: 'hitbox7', scaleX: 1, scaleY: 1 },
  { radius: 88, scoreValue: 45, img: 'circle8.webp', color: '#9B59B6', shape: 'hitbox8', scaleX: 1, scaleY: 1 },
  { radius: 96, scoreValue: 55, img: 'circle9.webp', color: '#E67E22', shape: 'hitbox9', scaleX: 1, scaleY: 1 },
  { radius: 104, scoreValue: 66, img: 'circle10.webp', color: '#2C3E50', shape: 'hitbox10', scaleX: 1, scaleY: 1 }
];

document.addEventListener('DOMContentLoaded', async () => {
  await delay(200);
  initializeGame().then(() => {
    console.log("Game is initialized after Twitch authorization.");
  });
  
  console.log("inside document " + userId + streamerId);
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const engine = Matter.Engine.create();
  const render = Matter.Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: 320,
      height: 455,
      wireframes: false, // Set to false to see sprites by default
      background: '#32BDC8',
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    const gameEndLink = document.getElementById('game-end-link');
    if (gameEndLink) {
      gameEndLink.addEventListener('click', function() {
        location.reload();
      });
    }
  });

  Matter.Render.run(render);
  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  const wallPad = 64;
  const loseHeight = 0; // Define the lose height
  const statusBarHeight = 10;
  const previewBallHeight = 10;
  const friction = {
    friction: 0.006,
    frictionStatic: 0.006,
    frictionAir: 0,
    restitution: 0.1
  };

  // Function to draw the lose height line
  function drawLoseHeightLine(ctx, loseHeight) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]); // Dashed line pattern
    ctx.beginPath();
    ctx.moveTo(0, loseHeight);
    ctx.lineTo(GAME.WIDTH, loseHeight);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
  }

  // Add the afterRender event to draw the lose height line
  Matter.Events.on(render, 'afterRender', function() {
    if (Game.stateIndex === GAME.STATES.READY || Game.stateIndex === GAME.STATES.DROP) {
      drawLoseHeightLine(render.context, loseHeight);
    }
  });
  
  // Custom rendering for wireframe mode
  Matter.Events.on(render, 'beforeRender', () => {
    if (render.options.wireframes) {
      const bodies = Matter.Composite.allBodies(engine.world);
      bodies.forEach(body => {
        if (body.sizeIndex !== undefined) {
          // Make the actual body visible in wireframe mode
          body.render.visible = true;
          
          // Remove sprite to only show hitbox
          if (body.render.sprite) {
            body.render.sprite = null;
          }
          
          // For compound bodies, ensure all parts are visible
          if (body.parts && body.parts.length > 1) {
            for (let i = 0; i < body.parts.length; i++) {
              body.parts[i].render.visible = true;
              if (body.parts[i].render.sprite) {
                body.parts[i].render.sprite = null;
              }
            }
          }
        }
      });
    }
  });

  // Toggle wireframe mode function (can be attached to a button)
  window.toggleWireframe = function() {
    render.options.wireframes = !render.options.wireframes;
    console.log(`Wireframe mode: ${render.options.wireframes ? 'ON' : 'OFF'}`);
  };

  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyC6JAz2rZBzHJbkRFbfgYeR8xgziE1WgSk",
    authDomain: "potato-game-f328b.firebaseapp.com",
    databaseURL: "https://potato-game-f328b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "potato-game-f328b",
    storageBucket: "potato-game-f328b.appspot.com",
    messagingSenderId: "579378992758",
    appId: "1:579378992758:web:fc1f7ca942d506b0c7f157"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore();
  let isGameInitialized = false;

  async function checkUserAndStart(db, userId, streamerId) {
    await delay(200);
    console.log("Checking user and starting game...");
    console.log('User ID:', userId);
    console.log('Channel ID:', streamerId);

    if (!userId || userId.trim() === "") {
        console.error("Invalid or empty userId. Cannot fetch document.");
        document.getElementById('username-entry').style.display = 'block';
        return;
    }

    const userRef = doc(db, "streamers", streamerId, "highscores", userId);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().streamerId === streamerId) {
            console.log("User exists with correct streamer ID, starting game...");
            user_name = docSnap.data().username;
            console.log(user_name);
            startGame();
        } else {
            console.log("User does not exist or streamer ID mismatch, showing username entry...");
            document.getElementById('username-entry').style.display = 'block';
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
    }
  }

  const Game = {
    currentPlayer: null,
    width: 320,
    height: 455,
    elements: {
      canvas: document.getElementById('gameCanvas'),
      ui: document.getElementById('game-ui'),
      score: document.getElementById('game-score'),
      end: document.getElementById('game-end-container'),
      endTitle: document.getElementById('game-end-title'),
      statusValue: document.getElementById('game-highscore-value'),
      nextFruitImg: document.getElementById('game-next-fruit'),
      previewBall: null,
      warning: document.querySelector('.height-warning')
    },
    cache: { highscore: 0 },
    stateIndex: GAME.STATES.MENU,
    score: 0,
    fruitsMerged: [],
    warningActive: false,
    sounds: {
      click: new Audio('./assets/click.mp3'),
      warning: new Audio('./assets/warning.mp3'),
      pop0: new Audio('./assets/pop0.mp3'),
      pop1: new Audio('./assets/pop1.mp3'),
      pop2: new Audio('./assets/pop2.mp3'),
      pop3: new Audio('./assets/pop3.mp3'),
      pop4: new Audio('./assets/pop4.mp3'),
      pop5: new Audio('./assets/pop5.mp3'),
      pop6: new Audio('./assets/pop6.mp3'),
      pop7: new Audio('./assets/pop7.mp3'),
      pop8: new Audio('./assets/pop8.mp3'),
      pop9: new Audio('./assets/pop9.mp3'),
      pop10: new Audio('./assets/pop10.mp3'),
    },
    calculateScore: function () {
      const score = Game.fruitsMerged.reduce((total, count, sizeIndex) => {
        const value = Game.fruitSizes[sizeIndex].scoreValue * count;
        return total + value;
      }, 0);

      Game.score = score;
      Game.elements.score.innerText = Game.score;
    },
    fruitSizes: [
      { radius: 24, scoreValue: 1, img: './assets/img/circle0.webp', shape: 'eggplant', scaleX: 1, scaleY: 1 },
      { radius: 32, scoreValue: 3, img: './assets/img/circle1.webp', shape: 'circle' },
      { radius: 40, scoreValue: 6, img: './assets/img/circle2.webp', shape: 'tomato', scaleX: 1, scaleY: 1 },
      { radius: 48, scoreValue: 10, img: './assets/img/circle3.webp', shape: 'pepper', scaleX: 1, scaleY: 1 },
      { radius: 56, scoreValue: 15, img: './assets/img/circle4.webp', shape: 'carrot', scaleX: 1, scaleY: 1 },
      { radius: 64, scoreValue: 21, img: './assets/img/circle5.webp', shape: 'onion', scaleX: 1, scaleY: 1 },
      { radius: 72, scoreValue: 28, img: './assets/img/circle6.webp', shape: 'hitbox6', scaleX: 1, scaleY: 1 },
      { radius: 80, scoreValue: 36, img: './assets/img/circle7.webp', shape: 'hitbox7', scaleX: 1, scaleY: 1 },
      { radius: 88, scoreValue: 45, img: './assets/img/circle8.webp', shape: 'hitbox8', scaleX: 1, scaleY: 1 },
      { radius: 96, scoreValue: 55, img: './assets/img/circle9.webp', shape: 'hitbox9', scaleX: 1.2, scaleY: 1 },
      { radius: 104, scoreValue: 66, img: './assets/img/circle10.webp', shape: 'hitbox10', scaleX: 1, scaleY: 1 },
    ],
    currentFruitSize: 0,
    nextFruitSize: 0,
    setNextFruitSize: function () {
      Game.nextFruitSize = Math.floor(Math.random() * 5);
      Game.elements.nextFruitImg.src = `./assets/img/circle${Game.nextFruitSize}.png`;
    },
    showHighscore: function () {
      Game.elements.statusValue.innerText = Game.cache.highscore;
    },
    loadHighscores: function () {
      const gameCache = localStorage.getItem('suika-game-cache');
      console.log("le 1 id est "+streamerId);
      if (gameCache === null) {
        Game.saveHighscore();
        return;
      }

      Game.cache = JSON.parse(gameCache);
      Game.showHighscore();
    },
    saveHighscore: function () {
      Game.calculateScore();
      if (Game.score < Game.cache.highscore) return;

      Game.cache.highscore = Game.score;
      Game.showHighscore();
      Game.elements.endTitle.innerText = 'New Highscore!';

      localStorage.setItem('suika-game-cache', JSON.stringify(Game.cache));
    },
    initGame: function () {
      Game.loadHighscores().then(() => {
        console.log("Scores loaded and UI updated.");
        console.log("le 2id est "+streamerId);
        console.log('Game initialized for player: '+user_name);
      });
      Matter.Render.run(render);
      Matter.Runner.run(runner, engine);

      Matter.Composite.add(engine.world, menuStatics);

      Game.loadHighscores();
      Game.elements.ui.style.display = 'none';

      Game.fruitsMerged = Array(Game.fruitSizes.length).fill(0);

      const menuMouseDown = function () {
        if (mouseConstraint.body === null || mouseConstraint.body?.label !== 'btn-start') {
          return;
        }

        Matter.Events.off(mouseConstraint, 'mousedown', menuMouseDown);
        Game.startGame();
      }

      Matter.Events.on(mouseConstraint, 'mousedown', menuMouseDown);
    },
    resetGame: function() {
      location.reload();
      document.getElementById('pause-button').disabled = true;
      document.getElementById('refresh-button').disabled = true;
    },
    startGame: function () {
      console.log(`Game starting for ${user_name}`);
      Game.sounds.click.play();
      document.getElementById('pause-button').disabled = false;
      document.getElementById('refresh-button').disabled = false;

      Matter.Composite.remove(engine.world, menuStatics);
      Matter.Composite.add(engine.world, gameStatics);

      Game.calculateScore();
      Game.elements.endTitle.innerText = 'Game Over!';
      Game.elements.ui.style.display = 'block';
      Game.elements.end.style.display = 'none';
      Game.elements.warning.style.display = 'none';
      Game.warningActive = false;
      
      Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, 0, { isStatic: true });
      Matter.Composite.add(engine.world, Game.elements.previewBall);

      setTimeout(() => {
        Game.stateIndex = GAME.STATES.READY;
      }, 250);

      Matter.Events.on(mouseConstraint, 'mouseup', function (e) {
        Game.addFruit(e.mouse.position.x);
      });

      Matter.Events.on(mouseConstraint, 'mousemove', function (e) {
        if (Game.stateIndex !== GAME.STATES.READY) return;
        if (Game.elements.previewBall === null) return;

        Game.elements.previewBall.position.x = e.mouse.position.x;
      });

// Helper function to compute centroid of an array of vertices
function getCentroid(vertices) {
  let sumX = 0, sumY = 0;
  vertices.forEach(v => {
    sumX += v.x;
    sumY += v.y;
  });
  return {
    x: sumX / vertices.length,
    y: sumY / vertices.length
  };
}


Matter.Events.on(render, 'afterRender', function() {
  const context = render.context;
  const bodies = Matter.Composite.allBodies(engine.world);
  
  // Draw custom sprites for complex bodies
  bodies.forEach(body => {
    if (body.isSpriteBody && !body.popped) {
      // Get the image from the DOM by ID or load it
      let img;
      if (body.spriteTexture.startsWith('./')) {
        // Get by src path - you may need to adjust this based on how images are loaded
        const imgId = 'img-' + body.sizeIndex;
        img = document.getElementById(imgId);
      } else {
        // Directly use texture path
        img = document.getElementById('img-' + body.sizeIndex);
      }
      
      if (img) {
        // Set up the transformation matrix for the sprite
        context.save();
        
        // Translate to the body's position
        context.translate(body.position.x, body.position.y);
        
        // Rotate with the body
        context.rotate(body.angle);
        
        // Draw the image centered on the body position
        const halfWidth = body.spriteWidth / 2;
        const halfHeight = body.spriteHeight / 2;
        
        // Draw the sprite with proper positioning
        context.drawImage(
          img, 
          -halfWidth + body.spriteOffsetX, 
          -halfHeight + body.spriteOffsetY, 
          body.spriteWidth, 
          body.spriteHeight
        );
        
        // Restore the context
        context.restore();
      }
    }
  });
});

      
      
      // Make sure we have the images available for the renderer
      Game.fruitSizes.forEach((size, index) => {
        const img = new Image();
        img.id = 'img-' + index;
        img.src = size.img;
        img.style.display = 'none';
        document.body.appendChild(img);
      });      
      
      // Check for height warning
      Matter.Events.on(engine, 'afterUpdate', function() {
        Game.checkHeightWarning();
        Game.checkLoseCondition();
        
        // Wake up sleeping bodies periodically
        if ((Game.frameCount || 0) % 30 === 0) {
          Game.wakeUpSleepingBodies();
        }
        Game.frameCount = (Game.frameCount || 0) + 1;
      });
      
      function removeBody(engine, body) {
        if (!body) return;
        
        // Check if body is still in the world
        if (!Matter.Composite.get(engine.world, body.id, 'body')) {
          return; // Body already removed
        }
        
        try {
          // Simply remove the body - no waking up or extras
          Matter.Composite.remove(engine.world, body);
        } catch (e) {
          console.warn('Error removing body:', e);
        }
      }

      Matter.Events.on(engine, 'collisionStart', function (e) {
        const processedPairs = new Set();
        
        for (let i = 0; i < e.pairs.length; i++) {
          const { bodyA, bodyB } = e.pairs[i];
          
          if (bodyA.isStatic || bodyB.isStatic || bodyA.isSensor || bodyB.isSensor) continue;
          
          // Get parent bodies if needed
          const actualBodyA = bodyA.parent && bodyA.parent.id !== bodyA.id ? bodyA.parent : bodyA;
          const actualBodyB = bodyB.parent && bodyB.parent.id !== bodyB.id ? bodyB.parent : bodyB;
          
          if (actualBodyA.id === actualBodyB.id) continue;
          
          // Create unique pair ID to prevent duplicate processing
          const pairId = [actualBodyA.id, actualBodyB.id].sort().join('-');
          if (processedPairs.has(pairId)) continue;
          processedPairs.add(pairId);
          
          // Skip if already popped
          if (actualBodyA.popped || actualBodyB.popped) continue;
          
          // Check size indices
          const sizeIndexA = actualBodyA.sizeIndex;
          const sizeIndexB = actualBodyB.sizeIndex;
          
          if (sizeIndexA === undefined || sizeIndexB === undefined || sizeIndexA !== sizeIndexB) continue;
          
          // Increment merged counter
          Game.fruitsMerged[sizeIndexA] += 1;
          
          // Calculate midpoint
          const midPosX = (actualBodyA.position.x + actualBodyB.position.x) / 2;
          const midPosY = (actualBodyA.position.y + actualBodyB.position.y) / 2;
          
          // Mark as popped
          actualBodyA.popped = true;
          actualBodyB.popped = true;
          
          // Play sound
          Game.sounds[`pop${sizeIndexA}`].play();
          
          // Get next size
          let newSize = sizeIndexA + 1;
          if (newSize >= Game.fruitSizes.length) newSize = 0;
          
          // Schedule removal and new body creation with minimal timeout
          setTimeout(() => {
            removeBody(engine, actualBodyA);
            removeBody(engine, actualBodyB);
            
            // Create new body
            const newBody = Game.generateFruitBody(midPosX, midPosY, newSize);
            Matter.Composite.add(engine.world, newBody);
            
            // Add pop effect
            Game.addPop(midPosX, midPosY, Game.fruitSizes[sizeIndexA].radius);
            
            // Update score
            Game.calculateScore();
          }, 10);
        }
});

    },
    addFruit: function (x) {
      if (Game.stateIndex !== GAME.STATES.READY) return;
    
      Game.sounds.click.play();
    
      Game.stateIndex = GAME.STATES.DROP;
      const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
      Matter.Composite.add(engine.world, latestFruit);
      
      // Set the last drop time to now
      lastDropTime = Date.now();
    
      Game.currentFruitSize = Game.nextFruitSize;
      Game.setNextFruitSize();
      Game.calculateScore();
    
      Matter.Composite.remove(engine.world, Game.elements.previewBall);
      Game.elements.previewBall = Game.generateFruitBody(render.mouse.position.x, previewBallHeight, Game.currentFruitSize, {
          isStatic: true,
          collisionFilter: { mask: 0x0040 }
      });
    
      setTimeout(() => {
          if (Game.stateIndex === GAME.STATES.DROP) {
              Matter.Composite.add(engine.world, Game.elements.previewBall);
              Game.stateIndex = GAME.STATES.READY;
          }
      }, 500);
    },
    
    // Check if any stable fruit is above the lose height
    checkLoseCondition: function() {
      if (Game.stateIndex !== GAME.STATES.READY && Game.stateIndex !== GAME.STATES.DROP) return;
      
      // Give a grace period of 1.5 seconds after dropping a fruit before checking for game over
      const currentTime = Date.now();
      if (currentTime - lastDropTime < 1500) return;
      
      const bodies = Matter.Composite.allBodies(engine.world);
      let hasStableBodyAboveLine = false;
      
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        // Skip static bodies, bodies without position, or already popped bodies
        if (body.isStatic || !body.position || body.popped) continue;
        
        // Check if body is at or above lose height AND has been stable for a moment
        if (body.position.y <= GAME.LOSE_HEIGHT && Math.abs(body.velocity.y) < 0.2) {
          // Check if the body has been there for at least a short while (not just falling through)
          if (!body.loseHeightTimestamp) {
            body.loseHeightTimestamp = currentTime;
          } else if (currentTime - body.loseHeightTimestamp > 500) {
            // Body has been stable above lose line for 500ms
            hasStableBodyAboveLine = true;
            break;
          }
        } else {
          // Reset timestamp if body moves away from lose height
          body.loseHeightTimestamp = null;
        }
      }
      
      if (hasStableBodyAboveLine) {
        Game.loseGame();
      }
    },
    
    // Wake up sleeping bodies that might be unsupported
    wakeUpSleepingBodies: function() {
      const bodies = Matter.Composite.allBodies(engine.world);
      
      bodies.forEach(body => {
        if (body.isStatic || !body.isSleeping) return;
        
        // Check if there is anything directly beneath this body
        const posX = body.position.x;
        const posY = body.position.y + (body.circleRadius || 40) + 5;
        
        // Create a small temporary probe beneath the body
        const probe = Matter.Bodies.circle(posX, posY, 2, { 
          isSensor: true,
          collisionFilter: { 
            category: 0x0002 
          } 
        });
        
        Matter.Composite.add(engine.world, probe);
        
        // Check for collisions with the probe
        const collisions = Matter.Query.collides(probe, bodies);
        Matter.Composite.remove(engine.world, probe);
        
        // If no collisions below (excluding itself), this body should fall
        const hasSupport = collisions.some(collision => 
          collision.bodyA.id !== body.id && 
          collision.bodyB.id !== body.id &&
          !collision.bodyA.isSensor && 
          !collision.bodyB.isSensor
        );
        
        if (!hasSupport) {
          // Wake up the body
          Matter.Sleeping.set(body, false);
          
          // Apply a small impulse to ensure it starts moving
          Matter.Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * 0.0001,
            y: 0.001
          });
        }
      });
    },
    // Wake up bodies in the vicinity of a point
    wakeNeighbors: function(x, y, radius) {
      const bodies = Matter.Composite.allBodies(engine.world);
      
      bodies.forEach(body => {
        if (body.isStatic) return;
        
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < radius) {
          Matter.Sleeping.set(body, false);
          
          // Apply a tiny force to ensure physics update
          Matter.Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * 0.001,
            y: 0.001
          });
        }
      });
    },
    
    // Check for height warning
    checkHeightWarning: function() {
      if (Game.stateIndex !== GAME.STATES.READY && Game.stateIndex !== GAME.STATES.DROP) return;
      
      const warningHeight = GAME.LOSE_HEIGHT + 40; // Warning threshold above lose height
      const bodies = Matter.Composite.allBodies(engine.world);
      let showWarning = false;
      
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.isStatic || !body.position) continue;
        
        // Check if any body is above warning height and stable
        if (body.position.y < warningHeight && Math.abs(body.velocity.y) < 0.2) {
          showWarning = true;
          break;
        }
      }
      
      // Show or hide warning message
      if (showWarning && !Game.warningActive) {
        Game.elements.warning.style.display = 'block';
        Game.elements.warning.classList.add('flashing');
        Game.sounds.warning.play();
        Game.warningActive = true;
      } else if (!showWarning && Game.warningActive) {
        Game.elements.warning.style.display = 'none';
        Game.elements.warning.classList.remove('flashing');
        Game.warningActive = false;
      }
    },
    
    addPop: function (x, y, r) {
      const circle = Matter.Bodies.circle(x, y, r, {
        isStatic: true,
        collisionFilter: { mask: 0x0040 },
        angle: Math.random() * (Math.PI * 2),
        render: {
          sprite: {
            texture: './assets/img/pop.png',
            xScale: r / 384,
            yScale: r / 384,
          }
        },
      });

      Matter.Composite.add(engine.world, circle);
      setTimeout(() => {
        Matter.Composite.remove(engine.world, circle);
      }, 100);
    },
    loseGame: async function() {
      Game.stateIndex = GAME.STATES.LOSE;
      
      // Hide the warning if it's active
      if (Game.warningActive) {
        Game.elements.warning.style.display = 'none';
        Game.elements.warning.classList.remove('flashing');
        Game.elements.canvas.classList.remove('flash');
        Game.warningActive = false;
      }
      
      // Show end screen
      Game.elements.end.style.display = 'flex';
      runner.enabled = false;
      let isNewHighscore = await Game.saveHighscore();
      document.getElementById('pause-button').disabled = true;
      document.getElementById('refresh-button').disabled = true;
    
      document.getElementById('game-score').innerText = "Score: " + Game.score;
      if (isNewHighscore) {
        document.getElementById('new-record').innerText = "GG EZ! New PB " + Game.score + "!";
      } else {
        document.getElementById('new-record').innerText = "Git Gud! Your score: " + Game.score;
      }
    
      console.log("Game Over! Try again?");
    },
    lookupFruitIndex: function (radius) {
      const sizeIndex = Game.fruitSizes.findIndex(size => size.radius == radius);
      if (sizeIndex === undefined) return null;
      if (sizeIndex === Game.fruitSizes.length - 1) return null;

      return sizeIndex;
    },


// generateFruitBody 
generateFruitBody: function (x, y, sizeIndex, extraConfig = {}) {
  const size = Game.fruitSizes[sizeIndex];
  const frictionProps = {
    friction: PHYSICS.FRICTION,
    frictionStatic: PHYSICS.FRICTION_STATIC,
    frictionAir: PHYSICS.FRICTION_AIR,
    restitution: PHYSICS.RESTITUTION
  };

  let body;
  
  if (size.shape && size.shape !== 'circle') {
    // For complex shapes
    const vertices = SHAPES[size.shape];
    
    // Apply special scaling for hitbox9 (pumpkin)
    let scaleX = (size.radius / 40) * (size.scaleX || 1);
    let scaleY = (size.radius / 40) * (size.scaleY || 1);
    
    // Reduce hitbox size for pumpkin (hitbox9)
    if (size.shape === 'hitbox9') {
      scaleX *= 0.85; 
    }
    
    // Create a single body with the complex shape
    body = Matter.Bodies.fromVertices(
      x, y, 
      [Matter.Vertices.scale(Matter.Vertices.create(vertices, null), scaleX, scaleY)],
      {
        ...frictionProps,
        ...extraConfig,
        label: 'fruit',
        sizeIndex: sizeIndex,
        render: { 
          // We'll make the physics body semi-transparent but visible for debugging
          fillStyle: 'rgba(255,255,255,0)'
        }
      },
      true
    );
    
    // Store sprite information on the body for custom rendering
    body.isSpriteBody = true;
    body.spriteWidth = size.radius * 2;
    body.spriteHeight = size.radius * 2;
    body.spriteTexture = size.img;
    body.spriteScale = size.radius / 512;
    
    // Set specific offsets for each vegetable type based on their shape
    let offsetY = 0;
    
    // Apply specific offsets for problematic shapes
    if (size.shape === 'eggplant') {
      offsetY = -5; // Adjust upward for eggplant
    } else if (size.shape === 'tomato') {
      offsetY = -6; // Adjust upward for tomato
    } else if (size.shape === 'pepper') {
      offsetY = -4; // Adjust upward for pepper
    } else if (size.shape === 'onion') {
      offsetY = -7; // Adjust upward for onion
    } else if (size.shape === 'carrot') {
      offsetY = 2; // Move sprite down for carrot
    } else if (size.shape === 'hitbox8') {
      offsetY = 4; // Move sprite down for broccoli (veg8)
    } else if (size.shape === 'hitbox9') {
      offsetY = -13; // Adjust for pumpkin (veg9)
    }
    
    // Calculate the natural bounds of the polygon manually
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    body.vertices.forEach(vertex => {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.y > maxY) maxY = vertex.y;
    });
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    
    // Apply the calculated offsets for sprite positioning
    body.spriteOffsetX = 0; // Default to center alignment for x-axis
    body.spriteOffsetY = offsetY; // Apply the shape-specific vertical offset
    
  } else {
    // For circle bodies - no changes needed
    body = Matter.Bodies.circle(x, y, size.radius, {
      ...frictionProps,
      ...extraConfig,
      label: 'fruit',
      sizeIndex: sizeIndex,
      render: {
        sprite: {
          texture: size.img,
          xScale: size.radius / (512 / 2),
          yScale: size.radius / (512 / 2)
        }
      }
    });
  }
  
  body.sizeIndex = sizeIndex;
  body.popped = false;
  body.circleRadius = size.radius;
  
  return body;
},
    
    addFruit: function (x) {
      if (Game.stateIndex !== GAME.STATES.READY) return;

      Game.sounds.click.play();

      Game.stateIndex = GAME.STATES.DROP;
      const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
      Matter.Composite.add(engine.world, latestFruit);

      Game.currentFruitSize = Game.nextFruitSize;
      Game.setNextFruitSize();
      Game.calculateScore();

      Matter.Composite.remove(engine.world, Game.elements.previewBall);
      Game.elements.previewBall = Game.generateFruitBody(render.mouse.position.x, previewBallHeight, Game.currentFruitSize, {
          isStatic: true,
          collisionFilter: { mask: 0x0040 }
      });

      setTimeout(() => {
          if (Game.stateIndex === GAME.STATES.DROP) {
              Matter.Composite.add(engine.world, Game.elements.previewBall);
              Game.stateIndex = GAME.STATES.READY;
          }
      }, 500);
    }
  };

  async function updateLeaderboard(db, userId, username, newScore, streamerId) {
    const streamerRef = doc(db, "streamers", streamerId);
    const scoresRef = collection(streamerRef, "highscores");
    const userScoresQuery = query(scoresRef, where("userId", "==", userId), limit(1));

    try {
        const snapshot = await getDocs(userScoresQuery);
        if (snapshot.empty) {
            await setDoc(doc(scoresRef), {
                userId: userId,
                username: username,
                score: newScore,
                streamerId: streamerId
            });
            console.log("New score added for the user.");
            return true;  // Indicates a new highscore
        } else {
            let docToUpdate = snapshot.docs[0];
            let currentHighest = docToUpdate.data().score;
            if (newScore > currentHighest) {
                await setDoc(doc(scoresRef, docToUpdate.id), {
                    score: newScore
                }, { merge: true });
                console.log("Highscore updated: New personal best for player.");
                return true;  // Indicates a new highscore
            }
        }
        return false;  // No new highscore
    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
  }

  window.submitUsername = async function() {
    user_name = document.getElementById('username-input').value;
    if (!user_name) {
      alert("Please enter a username.");
      return;
    }
    await setDoc(doc(db, "streamers",streamerId, "highscores", userId), {
      username: user_name,
      streamerId: streamerId,
      userId: userId,
      score: 0
    });
    startGame(); // Ensure username is passed here
  };

  function startGame() {
    console.log('Game starting for '+user_name);
    document.getElementById('username-entry').style.display = 'none';
  }

  document.getElementById('submitUsernameButton').addEventListener('click', async () => {
    if (!userId) {
      console.log(userId)
        console.error("User ID is not set. Cannot proceed.");
        return;
    }
    
    user_name = document.getElementById('username-input').value;
    if (!user_name) {
        alert("Please enter a username.");
        return;
    }

    try {
        await setDoc(doc(db, "streamers",streamerId, "highscores", userId), {
            username: user_name,
            streamerId: streamerId,
            userId: userId,
            score: 0
        });
        startGame();
    } catch (error) {
        console.error("Failed to set user document:", error);
    }
  });

  Game.saveHighscore = async function () {
    Game.calculateScore();
    let isNewHighscore = await updateLeaderboard(db, userId, user_name, Game.score, streamerId);
    if (isNewHighscore) {
      Game.cache.highscore = Game.score;
      Game.showHighscore();
      Game.elements.endTitle.innerText = 'New Highscore!';
    }
    return isNewHighscore;
  };

  try {
    await checkUserAndStart(db, userId, streamerId);
  } catch (error) {
    console.error("Failed to check user or start game:", error);
  }

  Game.loadHighscores = async function() {
    await delay(200);
    const streamerRef = doc(db, "streamers", streamerId);
    const scoresRef = collection(streamerRef, "highscores");
    const topScoresQuery = query(scoresRef, orderBy("score", "desc"), limit(3)); // Limit to top 3 scores
    console.log("le id est "+streamerId);
    const snapshot = await getDocs(topScoresQuery);

    let scoresText = "Top Scores:\n";
    let leaderboardHTML = '';
    let highestScore = 0;
    let rank = 1;

    snapshot.forEach(doc => {
      let data = doc.data();
      scoresText += `${data.username}: ${data.score}\n`;
        if (data.score > highestScore) {
            highestScore = data.score;
        }
      let medalImage = `./assets/img/medal${rank}.png`;
      leaderboardHTML += `<li>
                            <img src="${medalImage}" alt="Medal ${rank}">
                            <span class="name">${data.username}</span>
                            <span class="score">${data.score}</span>
                          </li>`;
      rank++;
    });

    console.log(scoresText);
    Game.cache.highscore = highestScore;
    Game.showHighscore();

    document.getElementById('leaderboard-list').innerHTML = leaderboardHTML;
    document.getElementById('leaderboard-list-pause').innerHTML = leaderboardHTML;
  };

  Game.showHighscore = function() {
    Game.elements.statusValue.innerText = Game.cache.highscore;
  };

  document.getElementById('resume-game').addEventListener('click', function() {
    document.getElementById('pause-screen').style.display = 'none';
    Matter.Runner.run(runner, engine);  // Use run instead of start
    Game.stateIndex = GAME.STATES.READY;
    document.getElementById('pause-button').disabled = false;
    document.getElementById('refresh-button').disabled = false;
  });

  document.getElementById('end-game').addEventListener('click', function() {
    document.getElementById('pause-screen').style.display = 'none';
    Game.resetGame();
  });

  document.getElementById('game-end-link').addEventListener('click', function(e) {
    e.preventDefault();
    Game.resetGame();
  });

  // Add wireframe toggle button event listener if it exists
  const wireframeToggle = document.getElementById('wireframe-toggle');
  if (wireframeToggle) {
    wireframeToggle.addEventListener('click', window.toggleWireframe);
  }

  function togglePause() {
    if (Game.stateIndex === GAME.STATES.READY || Game.stateIndex === GAME.STATES.DROP) {
        let pauseScreen = document.getElementById('pause-screen');
        if (Game.stateIndex !== GAME.STATES.PAUSE) {
            pauseScreen.style.display = 'flex';
            Matter.Runner.stop(runner);
            Game.stateIndex = GAME.STATES.PAUSE;
            document.getElementById('pause-button').disabled = true;
        } else {
            pauseScreen.style.display = 'none';
            Matter.Runner.start(runner, engine);
            Game.stateIndex = GAME.STATES.READY;
            document.getElementById('pause-button').disabled = false;
        }
    } else {
        console.log("Pausing not allowed in current game state.");
    }
  }

  document.getElementById('pause-button').addEventListener('click', togglePause);
  document.getElementById('refresh-button').addEventListener('click', function() {
    Game.resetGame();
  });

  const menuStatics = [
    Matter.Bodies.rectangle(Game.width / 2, Game.height * 0.4, Game.width * 0.95, Game.height * 0.95, {
      isStatic: true,
      render: { sprite: { texture: './assets/img/bg-menu.png' } },
    }),
    Matter.Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
      isStatic: true,
      label: 'btn-start',
      render: { sprite: { texture: './assets/img/btn-start.png' } },
    }),
  ];

  const wallProps = {
    isStatic: true,
    render: { fillStyle: '#FFEEDB' },
    ...friction,
  };

  const gameStatics = [
    Matter.Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),
    Matter.Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),
    Matter.Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2) - statusBarHeight, Game.width, wallPad, wallProps),
  ];

  const mouse = Matter.Mouse.create(render.canvas);
  const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false,
      },
    },
  });
  render.mouse = mouse;

  Game.initGame();

  const resizeCanvas = () => {
    const screenWidth = document.body.clientWidth;
    const screenHeight = document.body.clientHeight;

    let newWidth = Game.width;
    let newHeight = Game.height;
    let scaleUI = 1;

    if (screenWidth * (Game.height / Game.width) > screenHeight) {
      newHeight = Math.min(Game.height, screenHeight);
      newWidth = newHeight * (Game.width / Game.height);
      scaleUI = newHeight / Game.height;
    } else {
      newWidth = Math.min(Game.width, screenWidth);
      newHeight = newWidth * (Game.height / Game.width);
      scaleUI = newWidth / Game.width;
    }

    render.canvas.style.width = `${newWidth}px`;
    render.canvas.style.height = `${newHeight}px`;

    Game.elements.ui.style.width = `${Game.width}px`;
    Game.elements.ui.style.height = `${Game.height}px`;
    Game.elements.ui.style.transform = `scale(${scaleUI})`;
  };

  document.body.onload = resizeCanvas;
  document.body.onresize = resizeCanvas;
});