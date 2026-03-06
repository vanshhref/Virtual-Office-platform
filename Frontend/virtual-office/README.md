# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Common Issues & Solutions

### Issue 1: `Cannot find module 'phaser'`

- **Install Phaser and Node types**:

```bash
npm install phaser
npm install --save-dev @types/node
```

### Issue 2: Character not moving

- **Check browser console for errors** (F12).
- **Verify `update()` is being called** (temporarily add `console.log('update')` inside `Player.update()`).
- **Make sure keyboard focus is on the canvas** (no other input element capturing keys).

### Issue 3: Collision not working

- **Phaser config**: ensure `physics: { default: 'arcade' }` is set in your game config.
- **Player physics body**: verify `scene.physics.add.existing(this)` is called in the `Player` constructor.
- **Tile collision**: check that tiles use collision, e.g. `setCollision([2])` on the correct layer.

### Issue 4: Animations not playing

- **Spritesheet loaded correctly**: confirm the spritesheet/texture key matches what animations use.
- **Frame indices**: make sure frame indices line up with your spritesheet layout.
- **Debugging**: add temporary logs inside `createAnimations()` to confirm it runs and the expected keys exist.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
