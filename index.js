const http = require("http");
const WebSocketServer = require("websocket").server;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.end('WebSocket server is running.');
});

const PORT = process.env.PORT || 2000;

server.listen(PORT, () => {
});

const webSocket = new WebSocketServer({
    httpServer: server
});

const users = [];

webSocket.on('request', (req) => {
    const connection = req.accept();

    connection.on('message', (message) => {
        const data = JSON.parse(message.utf8Data);
        const user = findUser(data.name);

        console.log(data.name+"log")
        switch (data.type) {
            case "STORE_USER":
                if (user !== undefined) {

                    connection.send(JSON.stringify({
                        type: 'user already exists'
                    }));
                    return;
                }

                const newUser = {
                    name: data.name,
                    conn: connection,
                    isAvailable: true,
                };
                users.push(newUser);
                break;

            case "START_CALL":
                let userToCall = findUser(data.target);

                if (userToCall && userToCall.isAvailable) {
                    connection.send(JSON.stringify({
                        type: "CALL_RESPONSE",
                        data: "user is ready for call",
                        isOnline:true,
                        isAvailable:true

                    }));
                } else {

                    if (userToCall == undefined) {
                        connection.send(JSON.stringify({
                            type: "CALL_RESPONSE",
                            data: "user is not online",
                            isOnline:false,
                            isAvailable:false
                        }));
                    }
                    else{
                        connection.send(JSON.stringify({
                            type: "CALL_RESPONSE",
                            data: "user is talking to someone else",
                            isOnline:true,
                            isAvailable:false
                        }));
                    }
                }
                break;

            case "CREATE_OFFER":            
                let userToReceiveOffer = findUser(data.target);

                if (userToReceiveOffer) {
                    userToReceiveOffer.conn.send(JSON.stringify({
                        type: "OFFER_RECIEVED",
                        name: data.name,
                        data: data.data.sdp,
                        imageUrl:data.imageUrl,
                        userName:data.userName
                    }));
                }
                updateUserAvailability(data.name,false);
                updateUserAvailability(data.target,false);
                break;

            case "CREATE_ANSWER":                
                let userToReceiveAnswer = findUser(data.target);
                if (userToReceiveAnswer) {
                    userToReceiveAnswer.conn.send(JSON.stringify({
                        type: "ANSWER_RECIEVED",
                        name: data.name,
                        data: data.data.sdp
            
                    }));
                }
                break;

            case "ICE_CANDIDATE":
                let userToReceiveIceCandidate = findUser(data.target);
                if (userToReceiveIceCandidate) {
                    userToReceiveIceCandidate.conn.send(JSON.stringify({
                        type: "ICE_CANDIDATE",
                        name: data.name,
                        data: {
                            sdpMLineIndex: data.data.sdpMLineIndex,
                            sdpMid: data.data.sdpMid,
                            sdpCandidate: data.data.sdpCandidate
                        }
                    }));
                }
                break;

            case "CALL_ENDED":
                let userToNotifyCallEnded = findUser(data.target);
                if (userToNotifyCallEnded) {
                    userToNotifyCallEnded.conn.send(JSON.stringify({
                        type: "CALL_ENDED",
                        name: data.name
                    }));
                }
                updateUserAvailability(data.name,true);
                updateUserAvailability(data.target,true);
                break;
        }
    });

    // close
    connection.on('close', () => {
        users.forEach(user => {
            if (user.conn === connection) {
                users.splice(users.indexOf(user), 1);
            }
        });
    });
});

const findUser = (username) => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].name === username)
            return users[i];
    }
};

function updateUserAvailability(username, availability) {
    for (let user of users) {
        if (user.name === username) {
            user.isAvailable = availability;
            break;
        }
    }
}
module.exports=server
