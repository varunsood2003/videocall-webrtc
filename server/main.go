package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

var peers = make(map[*websocket.Conn]bool)

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("WebSocket upgrade error:", err)
		return
	}
	peers[conn] = true

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			delete(peers, conn)
			conn.Close()
			break
		}

		for peer := range peers {
			if peer != conn {
				peer.WriteMessage(websocket.TextMessage, msg)
			}
		}
	}
}

func main() {
	fs := http.FileServer(http.Dir("../client"))
	http.Handle("/", fs)

	http.HandleFunc("/ws", handleWebSocket)

	fmt.Println("Server started at http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
