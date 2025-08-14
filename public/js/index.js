const socket = io();

// DOM Elements
const openCreateRoomBox = document.getElementById("open-create-room-box");
const openJoinRoomBox = document.getElementById("open-join-room-box");
const createRoomBox = document.getElementById("create-room-box");
const roomIdInput = document.getElementById("room-id");
const cancelCreateActionBtn = document.getElementById("cancel-create-action");
const gameplayChoices = document.getElementById("gameplay-choices");
const createRoomBtn = document.getElementById("create-room-btn");
const gameplayScreen = document.querySelector(".gameplay-screen");
const startScreen = document.querySelector(".start-screen");
const cancelJoinActionBtn = document.getElementById("cancel-join-action");
const joinBoxRoom = document.getElementById("join-room-box");
const joinRoomBtn = document.getElementById("join-room-btn");
const joinRoomInput = document.getElementById("join-room-input");
const joinRandomBtn = document.getElementById("join-random");
const errorMessage = document.getElementById("error-message");
const playerOne = document.getElementById("player-1");
const playerTwo = document.getElementById("player-2");
const waitMessage = document.getElementById("wait-message");
const rock = document.getElementById("rock");
const paper = document.getElementById("paper");
const scissor = document.getElementById("scissor");
const myScore = document.getElementById('my-score');
const enemyScore = document.getElementById('enemy-score');
const playerOneTag = document.getElementById("player-1-tag");
const playerTwoTag = document.getElementById("player-2-tag");
const winMessage = document.getElementById("win-message");
const myChoiceDisplay = document.getElementById("my-choice-display");
const enemyChoiceDisplay = document.getElementById("enemy-choice-display");

// New DOM Elements
const playerNameInput = document.getElementById("player-name");
const targetScoreInput = document.getElementById("target-score");
const currentModeSpan = document.getElementById("current-mode");
const gameProgressSpan = document.getElementById("game-progress");
const gameEndScreen = document.getElementById("game-end-screen");
const finalResultH2 = document.getElementById("final-result");
const finalMyScore = document.getElementById("final-my-score");
const finalEnemyScore = document.getElementById("final-enemy-score");
const playAgainBtn = document.getElementById("play-again-btn");
const backToMenuBtn = document.getElementById("back-to-menu-btn");

//  Game variables
let canChoose = false;
let playerOneConnected = false;
let playerTwoIsConnected = false;
let playerId = 0;
let myChoice = "";
let enemyChoice = "";
let roomId = "";
let myScorePoints = 0;
let enemyScorePoints = 0;
let targetScore = 10;
let playerName = "";
let gameEnded = false;
let playerOneName = "";
let playerTwoName = "";

// Game End Screen Event Listeners
playAgainBtn.addEventListener("click", function() {
    resetGame();
    gameEndScreen.style.display = "none";
});

backToMenuBtn.addEventListener("click", function() {
    reset();
    gameEndScreen.style.display = "none";
});

openCreateRoomBox.addEventListener("click", function(){
    if (!validatePlayerSetup()) return;
    
    gameplayChoices.style.display = "none";
    createRoomBox.style.display = "block";
})

cancelCreateActionBtn.addEventListener("click", function(){
    gameplayChoices.style.display = "block";
    createRoomBox.style.display = "none";
})

createRoomBtn.addEventListener("click", function(){
    let id = roomIdInput.value;
    if (!id.trim()) {
        showError("Please enter a room name");
        return;
    }

    clearError();
    socket.emit("create-room", { id, playerName, targetScore });
})

openJoinRoomBox.addEventListener("click", function(){
    if (!validatePlayerSetup()) return;
    
    // Hide target score input when joining room
    document.getElementById("score-settings").style.display = "none";
    
    gameplayChoices.style.display = "none";
    joinBoxRoom.style.display = "block";
})

cancelJoinActionBtn.addEventListener("click", function(){
    gameplayChoices.style.display = "block";
    joinBoxRoom.style.display = "none";
})

joinRoomBtn.addEventListener("click", function(){
    let id = joinRoomInput.value;
    if (!id.trim()) {
        showError("Please enter a room ID");
        return;
    }

    clearError();
    socket.emit("join-room", { id, playerName });
})

joinRandomBtn.addEventListener("click", function(){
    clearError();
    socket.emit("join-random", { playerName });
})

rock.addEventListener("click", function(){
    if(canChoose && myChoice === "" && playerOneConnected && playerTwoIsConnected && !gameEnded){
        myChoice = "rock";
        choose(myChoice);
        socket.emit("make-move", {playerId, myChoice, roomId});
    }
})

paper.addEventListener("click", function(){
    if(canChoose && myChoice === "" && playerOneConnected && playerTwoIsConnected && !gameEnded){
        myChoice = "paper";
        choose(myChoice);
        socket.emit("make-move", {playerId, myChoice, roomId});
    }
})

scissor.addEventListener("click", function(){
    if(canChoose && myChoice === "" && playerOneConnected && playerTwoIsConnected && !gameEnded){
        myChoice = "scissor";
        choose(myChoice);
        socket.emit("make-move", {playerId, myChoice, roomId});
    }
})

// Socket
socket.on("display-error", error => {
    showError(error);
})

socket.on("room-created", data => {
    playerId = 1;
    roomId = data.id;
    targetScore = data.targetScore;
    playerName = data.playerName;
    playerOneName = data.playerName;

    setPlayerTag(1);
    updateGameInfo();
    startScreen.style.display = "none";
    gameplayScreen.style.display = "block";
})

socket.on("room-joined", data => {
    playerId = 2;
    roomId = data.id;
    targetScore = data.targetScore;
    playerName = data.playerName;
    playerTwoName = data.playerName;

    playerOneConnected = true;
    playerJoinTheGame(1)
    setPlayerTag(2);
    setWaitMessage(false);
    updateGameInfo();

    startScreen.style.display = "none";
    gameplayScreen.style.display = "block";
})

socket.on("player-1-connected", (data) => {
    playerJoinTheGame(1);
    playerOneConnected = true;
    if (data && data.playerName) {
        playerOneName = data.playerName;
        setPlayerTag(playerId);
    }
})

socket.on("player-2-connected", (data) => {
    playerJoinTheGame(2)
    playerTwoIsConnected = true
    canChoose = true;
    setWaitMessage(false);
    if (data && data.playerName) {
        playerTwoName = data.playerName;
        setPlayerTag(playerId);
    }
});

socket.on("player-1-name", (data) => {
    if (data && data.playerName) {
        playerOneName = data.playerName;
        setPlayerTag(playerId);
    }
});

socket.on("player-1-disconnected", () => {
    reset()
})

socket.on("player-2-disconnected", () => {
    canChoose = false;
    playerTwoLeftTheGame()
    setWaitMessage(true);
    resetGameState();
})

socket.on("draw", ({myChoice, enemyChoice}) => {
    displayChoices(myChoice, enemyChoice);
    let message = `It's a draw! Both players chose ${myChoice}.`;
    setWinningMessage(message);
    checkGameEnd();
})

socket.on("player-1-wins", ({myChoice, enemyChoice}) => {
    displayChoices(myChoice, enemyChoice);
    
    if(playerId === 1){
        let message = `You win! You chose ${myChoice} and enemy chose ${enemyChoice}.`;
        setWinningMessage(message);
        myScorePoints++;
    }else{
        let message = `You lose! You chose ${myChoice} and enemy chose ${enemyChoice}.`;
        setWinningMessage(message);
        enemyScorePoints++;
    }

    displayScore();
    checkGameEnd();
})

socket.on("player-2-wins", ({myChoice, enemyChoice}) => {
    displayChoices(myChoice, enemyChoice);
    
    if(playerId === 2){
        let message = `You win! You chose ${myChoice} and enemy chose ${enemyChoice}.`;
        setWinningMessage(message);
        myScorePoints++;
    }else{
        let message = `You lose! You chose ${myChoice} and enemy chose ${enemyChoice}.`;
        setWinningMessage(message);
        enemyScorePoints++;
    }

    displayScore();
    checkGameEnd();
})
