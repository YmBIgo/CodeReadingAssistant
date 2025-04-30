export type MessageType = "say" | "ask" | "user" | "system"
export type Message = {
    type: MessageType;
    content: string;
    time: number;
}