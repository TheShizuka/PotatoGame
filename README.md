# Potato Game: A Physics-Based Vegetable Stacking Game

Potato Game is a modern, physics-based game inspired by Suika Game where players stack vegetables of the same type to merge them into larger ones and earn points. With features like **leaderboards**, **physics-based interactions**, and **Twitch integration**, Potato Game provides a fun and engaging gaming experience.

## Features
- **Physics Engine**: Realistic vegetable collisions and interactions using Matter.js.
- **Unique Vegetable Shapes**: Various vegetables with distinct physical properties and behaviors.
- **Leaderboard System**: Track and compete for high scores with other players.
- **Dual Deployment Options**: Web version with username login and Twitch panel extension.
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices.
- **Real-Time Updates**: Scores update instantly without page refreshes.
- **Pause & Restart**: Control your game session with pause functionality and quick restarts.

## Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript, Matter.js
- **Backend**: Firebase for database and user authentication
- **Build Tools**: Webpack, Babel
- **Integration**: Twitch Extensions SDK
- **Deployment**: Web hosting and Twitch Developer Console

## Live Demo
Check out the live demo of Potato Game:  
[Potato Game Live Demo](http://147.93.94.250/potatogame/)

## Screenshots
### Game Screen
![Game Screen](screenshots/game.PNG)
### Leaderboard
![Leaderboard](screenshots/leaderboard.PNG)

## Installation
To run Potato Game locally, follow these steps:

### Prerequisites
- Node.js (v16 or higher)
- NPM or Yarn package manager

### Setup
1. Clone the repository:
```bash
git clone https://github.com/TheShizuka/PotatoGame
cd potato-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

The game will be available at `http://localhost:8080` or by opening the `public/index.html` file in your browser.

## Twitch Extension Deployment

1. Build the project:
```bash
npm run build
```

2. Create a ZIP file containing:
   - `public/bundle.js`
   - `public/index.html`
   - `public/matter.js`
   - `public/assets/` folder

3. Upload the ZIP to your Twitch Developer Console.

## Contact
If you have any questions or feedback, feel free to reach out:
- Email: ayatgimenez@hotmail.com
- LinkedIn: [Hicham AYAT GIMENEZ](https://www.linkedin.com/in/hicham-a-9553ba28b/)
- Portfolio: [Portfolio Website](https://shizukadesu.com/)

Made with ❤️ for the Twitch community