# Catch Project - Vanilla
This document outlines the method of operation, code structure, and other to-dos.

## 0. Operation
### 0.1 Prerequisites
1. A device with a browser capable of running Javascript (ECMAScript 2015 or above).
2. An active internet connection, both for **initializing the game**, and for game management. 
3. A GPS-enabled device compatible with the Geolocation API.

### 0.2 Operating Instructions
#### 0.2.1 Game Modes

Only the **Team Progress** Game Mode has been implemented. The rules are as follows.

** 0.2.1a Team Progress Game - Rundown**
*Objective: "capture" the majority of checkpoints, or to score the most points for the team.*
1. A room is valid for 6-12 players or more. For best experience, invite *even* number of players.
2. All players are equally divided to 2 teams, *Team Red* and *Team Blue*.
3. Each player must gain points for their team by the following -
	a. Visit a Checkpoint by entering the Checkpoint Circle indicated by a blue perimeter.
	b. Request and Complete the Task by clicking the Request Task Button.
4. Under the following condition, a task will not be available -
	a. Consecutive Visit
		After a successfully submitted task, a player must visit other checkpoints before another task could be requested in the same checkpoint.
	b. Secured Checkpoint
		 A checkpoint can be secured when the Secure Threshold of that checkpoint has been reached. A Secured Checkpoint is indicated by a colored padlock square next to the Checkpoint's Identifier.
5. Prohibitions
	a. The Game bound is indicated by a grey square over the play field. It is The player should not leave the play field during the course of the game. By default, the play field is bounded by top-left-most and the right-left-most checkpoint, with 2.9 times the average radius of the Checkpoint Circle as buffer.
6. Scoring Table
	a. Task Submission
		1 Energy for the Team.
	b. Checkpoint Secure
		1 Energy, and 25% bonus of the Capture Threshold for the Team.
7. End Conditions
	The Game ends in the following 2 ways -
	a. Timeout
		The designated time for the game has run out. Default is 15 minutes.
		The Team with the most Energy wins.
	b. Checkpoint Majority
		The number of Secured Checkpoints have exceeded the Majority Percentage. Default is 50%.
		The first Team to reach the Checkpoint Majority Count wins.

#### 0.2.2 Instructions for Operation
1. The Web App starts in the Start Menu Screen. To start a Game, Click on the *Green Running Man* Icon on the bottom right corner, then Click *Create +*.
2. Following the on-screen instructions to assign Checkpoints - Click to add a Checkpoint, and click again to remove an existing Checkpoint. Checkpoints are automatically named. By default, Checkpoint Circles are 30 meters in radius. Click Create once all Checkpoints have been assigned.
3. A *Team Progress Game* will be Created. ~~To change Game Parameters, click on the Parameter Box.~~. ~~Other players can join the game by typing the Game ID shown. To force a Team, clicking on the Player Box will cycle through all possible Teams.~~ (Multiplayer Functionality yet to be implemented.)
4. The host should click *Start* to Start the Game. The Game will commence according to Section 0.2.1a.
5. After Game Completion, Click *Return to Main Menu* to return to the Start Menu.

#### 0.2.9 Debug Helpers
This game has not reached a playable stage. Therefore, 3 debug helper functions are available to be called from the console to simulate a game. 

To get the active screen, do `s()`.

These commands must be run when the `TeamProgressGameScreen` is loaded. To check, do `s().name` and check if the screen name is `TeamProgressGame`. 

1. `s().visit(checkpoint_id)` Simulates a Geolocation Visit to a checkpoint.
2. `s().task_ok()` Simulates a Task Completion.

## 1. Technical Specifications
### 1.0 External Libraries
- [LeafletJS](https://leafletjs.com) For Background Map Rendering
- [OpenStreetMap Standard Layers](https://wiki.openstreetmap.org/wiki/Standard_tile_layer) As the Tile Source
- [LeafletGeometryUtil](http://makinacorpus.github.io/Leaflet.GeometryUtil/) For Bounds and Coordinates Calculations
- [Bulma](https://bulma.io/) For Basic Styling.
All External Libraries are imported with *script source imports* (rather than *JS imports*) for compatability and source considerations. See `index.html > head` for these imports. 

### 1.1 Directory Structure
- `avatars`: Stores the available avatar icons (taken from *NEW GAME Characters*). These could be assigned to the player by enter the numeric ID (12 for `avatar-th12.png`). See `index.js -> newPlayer` for more information.
- `riddles`: Here lies the Tasks available for request. These are (and must be) HTML Singletons which will be loaded by *HTML iFrames* during the Task Request Process. 
- `index.html` `index.css` `index.js` Other parts of the App lies here.

### 1.2 Code Structure
#### 1.2.1 Data Structures

*For more information, see corresponding Factory Function. Base data structure is declared on the first line.*

##### 1.2.1.1 Primary Data Structures
- `Player`: Includes Player Data.
- `Role`: Includes the Current Role (Team, Score) of the Active Game of the Player.
`Checkpoint`: Includes Checkpoint Coordinates, Name and other information.

##### 1.2.1.2 Primary Game Logic Data Structures
- `TeamProgressPendingGame`: A Pending Game of *Team Progress* Game Mode, which could be started by calling `this.start()`.
- `TeamProgress`: An object to be attached to a Checkpoint to indicate Capture Progress.

#### 1.2.2 Renders
A `Renders` Object contains all related Nodes, Handles and Information to be shown to the screen.
A `Renders` Object will at least contain 1 of the following methods, corresponding to their targets.

- `addTo(node)`, `remove()`, and `target_div`: Append the corresponding HTML elements to the node specified.
- `renderTo(lmap)`, `unrender()`, and `target_lmap`: Render the corresponding Leaflet Overlays to the Leaflet Map specified.
- `loadTo(node, lmap)`, `unload()`, `target_div` and `target_lmap`: A combination of the two methods above when needed. Mostly used in Screens. As known as `addRenderTo`.
- `attachTo(lmap_feature)`, `unrender()`, and `target_feature`: Attach a Leaflet Overlay Object to an existing Leaflet Layer.

##### 1.2.2.1 Primary Renders
`PlayerCircleRender -> lmap`: Player Avatar Icon
`PlayerBoxRender -> node`: Player Avatar and Name as a Square
`CheckpointRender -> lmap`: Checkpoint Name and Checkpoint Circle

##### 1.2.2.2 Game Logic Renders
`TeamProgressRender -> lmap_feature`: Team Progress Bars, or colored padlock when secured.

#### 1.2.3 Screens
Screens are self-contained, Logic-implemented Views. All data, except for received data, should be passed to the Screen during initialization.

Screen Objects are structured as shown -
	`name`: Name for Handler identification.
	`globals`: Data storage of the View.
	`listeners`: Listeners.
	`attachers`: Methods to attach Listeners to appropriate handles and start listening. Attachers have the same name for the corresponding Listener.
	`renderers`: Renders containing multiple `Renders` Objects; could be interpreted as an attacher for Renders objects.
	`renders`: The final `Renders` for the View. Must implement `loadTo(node, lmap)` and `unload()`. 

Current Available Screens are -
	1. `StartMenuScreen` (`StartMenu`) : Start Menu
	2. `GameInitScreen` (`GameInit`) : Team Progress Creation Screen, Handlers for Checkpoint Declaration and Creation
	3. `PendingGameScreen` (`PendingGame`): Waiting Room for Game
	4. `TeamProgressGameScreen` (`TeamProgressGame`): In Game Screen for Team Progress Games

#### 1.2.4 Tasks / Riddles
Tasks / Riddles must be iframe-compatible HTML singletons. It is best to package everything within the same HTML file to avoid conflicts and import issues. 

The Tasks are loaded dynamically by iframes. Communication between Tasks and Screens are done with Cross-Window Messaging. The Task should be able to handle the following Window Messages, by `window.addEventListener("message", handler)`.
`TASK_INIT`: Starts or Reset the Task.
`TASK_CANCEL` (Optional): Clear States and Memory as the requested Task has been cancelled.

The Task should also be able to send out the following Window Message, by `window.parent.postMessage(message, "*" || "target_domain)`.
`TASK_OK`: The Task has been successfully completed.

To allow the Task to be requested, add the Task URL to `game_screen.listeners.on_task_request.TASK_URLS`.

#### 1.2.5 Handler Singleton
The Handler is the main Handler and Coordinator between Screens. This is also where WebSocket inputs should be passed and handled. 

##### 1.2.5.1 Handler Methods
The two main methods for the Handler are -
1. `HANDLER.push(action_object)`: Where commands can be issued.
	a. `action_objects` is an Object with the following structure.
	```
	{action: "ACTION", 
		args: {...},
	}
	```
		Arguments that should be passed differs between actions.
	b. Currently available actions:
		1. `INIT_GAME <- (player: Player)`: Start the Team Progress Game Initialization Screen.
		2. `CREATE_GAME <- (game: TeamProgressPendingGame)`: Create the Team Progress Game.
		3. `HOST_START_GAME <- (game: TeamProgressPendingGame, player: Player)`: Starts the Game and jumps to the Team Progress Game Screen.
		4. `GAME_CHECKPOINT_TASK_COMPLETED <- (gid: TeamProgressPendingGame.gid, player: Player)`: Updates energy levels and capture states of checkpoints. Called when a Task have been submitted successfully.
		5. `GAME_ENDED <- (gid: TeamProgressPendingGame.gid)`: Called when a Game End State is detected by any client. 
		6. `GAME_EXIT <- (player: Player)`: Returns the Player to the Main Menu only. Called when the Exit is expected.
		7. `GAME_QUIT <- (player: Player)` (To be implemented): Same as `GAME_EXIT`, but should remove the Player from the Game when received by other players. Called when the Exit is unexpected.
	
2. `HANDLER.pushScreen(ScreenObject, [div, lmap])`: Unloads the Current Screen and push the new Screen. If no new `target_div` and / or `target_lmap` is provided, it will be inherited from the last unloaded screen.

##### 1.2.5.2 Handler Variables
The Handler contains 4 main global variables. They are -
`HANDLER.globals.player`: The current logged in Player.
`HANDLER.globals.app`: The App Container Node.
`HANDLER.globals.ui_overlay`: The Overlay Layer.
`HANDLER.globals.lmap`: The Leaflet Map Layer.

#### 1.2.6 Site Structure
`index.html` contains *script imports* for External Libraries. 
The site is designed to be mobile-friendly and responsive and has a max width of 500px. 

The HTML body contains `lmap`, the render target of the Leaflet Map. 
On top of it is a transparent, pass-through layer called `ui-overlay`, the render target for most UI elements. The layer is pass-through while elements on this layer is clickable. To set elements as pass-through as well, add the `ui-pass` class to the element.

Numerous Position and CSS Helpers and Fixes are in place. See `index.css` for more details. 

## 2. Todos
### 2.1 Geolocation Support
A sample Geolocation Integration Example is included in the `./T2` Directory.

### 2.2 Multiplayer WebSocket Server
#### 2.2.1 Multiplayer Handlers and Listeners
