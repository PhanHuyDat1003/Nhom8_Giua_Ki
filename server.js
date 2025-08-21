const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");

const app = express();

const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "public")));

const io = socketio(server);

const {userConnected, connectedUsers, initializeChoices, moves, makeMove, choices} = require("./util/users");
const {createRoom, joinRoom, exitRoom, rooms} = require("./util/rooms");
const e = require("express");
const { exitCode } = require("process");

// Store player information and game settings
const playerInfo = {};
const gameSettings = {};

io.on("connection", socket => {
    socket.on("create-room", (data) => {
        const { id, playerName, targetScore } = data;
        
        if(rooms[id]){
            const error = "This room already exists";
            socket.emit("display-error", error);
        }else{
            userConnected(socket.client.id);
            createRoom(id, socket.client.id);
            
            // Store player info and game settings
            playerInfo[socket.client.id] = { name: playerName, playerId: 1 };
            gameSettings[id] = { targetScore };
            
            socket.emit("room-created", { 
                id, 
                playerName, 
                targetScore 
            });
            socket.emit("player-1-connected", { playerName });
            socket.join(id);
        }
    })

    socket.on("join-room", data => {
        const { id, playerName } = data;
        
        if(!rooms[id]){
            const error = "This room doesn't exist";
            socket.emit("display-error", error);
        }else{
            userConnected(socket.client.id);
            joinRoom(id, socket.client.id);
            socket.join(id);

            // Get game settings from room
            const roomSettings = gameSettings[id] || { targetScore: 10 };
            
            // Store player info
            playerInfo[socket.client.id] = { name: playerName, playerId: 2 };

            // Get player 1 info
            const player1SocketId = rooms[id][0];
            const player1Info = playerInfo[player1SocketId];
            
            socket.emit("room-joined", { 
                id, 
                playerName, 
                targetScore: roomSettings.targetScore 
            });
            socket.emit("player-2-connected", { playerName });
            socket.emit("player-1-name", { playerName: player1Info ? player1Info.name : "Player 1" });
            socket.broadcast.to(id).emit("player-2-connected", { playerName });
            initializeChoices(id);
        }
    })

    socket.on("join-random", (data) => {
        const { playerName } = data;
        let roomId = "";

        for(let id in rooms){
            if(rooms[id][1] === ""){
                roomId = id;
                break;
            }
        }

        if(roomId === ""){
            const error = "All rooms are full or none exists";
            socket.emit("display-error", error);
        }else{
            userConnected(socket.client.id);
            joinRoom(roomId, socket.client.id);
            socket.join(roomId);

            // Get game settings from room
            const roomSettings = gameSettings[roomId] || { targetScore: 10 };
            
            // Store player info
            playerInfo[socket.client.id] = { name: playerName, playerId: 2 };

            // Get player 1 info
            const player1SocketId = rooms[roomId][0];
            const player1Info = playerInfo[player1SocketId];
            
            socket.emit("room-joined", { 
                id: roomId, 
                playerName, 
                targetScore: roomSettings.targetScore 
            });
            socket.emit("player-2-connected", { playerName });
            socket.emit("player-1-name", { playerName: player1Info ? player1Info.name : "Player 1" });
            socket.broadcast.to(roomId).emit("player-2-connected", { playerName });
            initializeChoices(roomId);
        }
    });

    socket.on("make-move", ({playerId, myChoice, roomId}) => {
        makeMove(roomId, playerId, myChoice);

        if(choices[roomId][0] !== "" && choices[roomId][1] !== ""){
            let playerOneChoice = choices[roomId][0];
            let playerTwoChoice = choices[roomId][1];

            if(playerOneChoice === playerTwoChoice){
                io.to(roomId).emit("draw", {myChoice: playerOneChoice, enemyChoice: playerTwoChoice});
                
            }else if(moves[playerOneChoice] === playerTwoChoice){
                let enemyChoice = "";

                if(playerId === 1){
                    enemyChoice = playerTwoChoice;
                }else{
                    enemyChoice = playerOneChoice;
                }

                io.to(roomId).emit("player-1-wins", {myChoice, enemyChoice});
            }else{
                let enemyChoice = "";

                if(playerId === 1){
                    enemyChoice = playerTwoChoice;
                }else{
                    enemyChoice = playerOneChoice;
                }

                io.to(roomId).emit("player-2-wins", {myChoice, enemyChoice});
            }

            choices[roomId] = ["", ""];
        }
    });

    socket.on("disconnect", () => {
        if(connectedUsers[socket.client.id]){
            let player;
            let roomId;

            for(let id in rooms){
                if(rooms[id][0] === socket.client.id || 
                    rooms[id][1] === socket.client.id){
                    if(rooms[id][0] === socket.client.id){
                        player = 1;
                    }else{
                        player = 2;
                    }

                    roomId = id;
                    break;
                }
            }

            exitRoom(roomId, player);

            // Clean up player info and game settings
            delete playerInfo[socket.client.id];
            if (rooms[roomId] && rooms[roomId][0] === "" && rooms[roomId][1] === "") {
                delete gameSettings[roomId];
            }

            if(player === 1){
                io.to(roomId).emit("player-1-disconnected");
            }else{
                io.to(roomId).emit("player-2-disconnected");
            }
        }
    })
})

server.listen(5000, () => console.log("Server started on port http://localhost:5000/..."));