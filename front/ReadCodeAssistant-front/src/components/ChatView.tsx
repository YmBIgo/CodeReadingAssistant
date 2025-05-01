import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Message } from "../type/Message";
import { Box, Button, TextareaAutosize } from "@mui/material";

type ChatViewType = {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  wsRef: RefObject<WebSocket | null>;
};

const initialConfigPrimaryButtons = [
  "Send rootPath",
  "Send rootFunctionName",
  "Send purpose",
];

const ChatView: React.FC<ChatViewType> = ({ messages, setMessages, wsRef }) => {
  const [rootPath, setRootPath] = useState<string>("");
  const [rootFunctionName, setRootFunctionName] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [primaryButtonText, setPrimaryButtonText] =
    useState<string>("Send rootPath");
  const [secondaryButtonText, setSecondaryButtonText] =
    useState<string>("Cancel");
  const [inputText, setInputText] = useState<string>("");
  const lastMessage = messages[messages.length - 1];
  const task =
    rootPath && rootFunctionName && purpose
      ? `rootPath : ${rootPath}
rootFunctionName: ${rootFunctionName}
purpose: ${purpose}`
      : "Task not started...";
  const handleOnKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const handleSecondaryButtonClick = () => {
    if (primaryButtonText === initialConfigPrimaryButtons[1]) {
      setMessages([
        ...messages,
        {
          type: "say",
          content: "Please input rootPath you want to search.",
          time: Date.now(),
        },
      ]);
      setRootPath("");
      setPrimaryButtonText(initialConfigPrimaryButtons[0]);
      return;
    }
    if (primaryButtonText === initialConfigPrimaryButtons[2]) {
      setMessages([
        ...messages,
        {
          type: "say",
          content: "Please input rootFunctionName you want to search.",
          time: Date.now(),
        },
      ]);
      setRootFunctionName("");
      setPrimaryButtonText(initialConfigPrimaryButtons[1]);
      return;
    }
  };
  const handlePrimaryButtonClick = () => {
    if (initialConfigPrimaryButtons.includes(primaryButtonText)) {
      handleSendMessage();
      return;
    }
    if (primaryButtonText === "Start Task") {
      wsRef.current?.send(
        JSON.stringify({
          type: "Init",
          rootPath,
          rootFunctionName,
          purpose,
        })
      );
      setPrimaryButtonText("")
    }
    if (primaryButtonText === "Response") {
      if (!inputText.trim()) return;
      wsRef.current?.send(
        JSON.stringify({
          type: "Ask",
          askResponse: inputText.trim(),
        })
      );
      setPrimaryButtonText("")
    }
  };
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (text) {
      if (!rootPath) {
        setRootPath(text);
        setInputText("");
        setMessages([
          ...messages,
          {
            type: "say",
            content: "Please input rootFunctionName you want to search.",
            time: Date.now(),
          },
        ]);
        setSecondaryButtonText("Back");
        setPrimaryButtonText(initialConfigPrimaryButtons[1]);
        return;
      }
      if (!rootFunctionName) {
        setRootFunctionName(text);
        setInputText("");
        setMessages([
          ...messages,
          {
            type: "say",
            content: "Please input purpose of your search.",
            time: Date.now(),
          },
        ]);
        setSecondaryButtonText("Back");
        setPrimaryButtonText(initialConfigPrimaryButtons[2]);
        return;
      }
      if (!purpose) {
        setPurpose(text);
        setInputText("");
        setMessages([
          ...messages,
          {
            type: "say",
            content: "Press 'Start Task' button to start task.",
            time: Date.now(),
          },
        ]);
        setSecondaryButtonText("Back");
        setPrimaryButtonText("Start Task");
        return;
      }
    }
  };
  useEffect(() => {
    if (lastMessage.type === "ask") {
      setPrimaryButtonText("Response");
      const messagesContainer = document.getElementById("messages");
      messagesContainer?.lastElementChild?.scrollIntoView({block: "end", behavior: "smooth"})
    }
  }, [lastMessage]);
  return (
    <Box
      sx={{
        width: "450px",
        height: "calc(100vh - 150px)",
        backgroundColor: "gray",
        overflow: "scroll",
        position: "relative",
      }}
      id="container"
    >
      <Box
        sx={{
          border: "3px solid blue",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "10px",
          width: "410px",
          margin: "10px 0",
          position: "fixed",
          top: "0px",
          left: "0px",
        }}
      >
        <p>{task}</p>
      </Box>
      <Box
        id="messages"
        sx={{
          width: "410px",
          padding: "10px",
          margin: "50px 0 50px",
          height: "calc(100vh - 450px)",
        }}
      >
        {messages.map((message) =>
          message.type === "ask" || message.type === "say" ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                backgroundColor: "white",
                padding: "10px",
                margin: "10px 0",
                whiteSpace: "break-spaces",
                width: "410px",
              }}
            >
              {message.content}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "white",
                padding: "10px",
                margin: "10px 0",
                whiteSpace: "break-spaces",
                width: "410px",
              }}
            >
              {message.content}
            </Box>
          )
        )}
      </Box>
      <Box
        sx={{
          position: "fixed",
          bottom: "10px",
          left: "10px",
        }}
      >
        <TextareaAutosize
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleOnKeyDown}
          style={{
            width: "390px",
          }}
          minRows={3}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            disabled={!secondaryButtonText}
            onClick={handleSecondaryButtonClick}
            variant="contained"
            color="inherit"
          >
            {secondaryButtonText || "　"}
          </Button>
          <Button
            disabled={!primaryButtonText}
            onClick={handlePrimaryButtonClick}
            variant="contained"
            color="primary"
          >
            {primaryButtonText || "　"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatView;
