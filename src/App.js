import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
 
function App() {
  console.log(window.navigator.platform);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [image, setImage] = useState("red.jpg");
  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", handleStatusChange);

    window.addEventListener("offline", handleStatusChange);

    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, [isOnline]);

  const imageUrl = "https://i.imgur.com/H124sSq.jpg";
  // console.log(navigator.platform);
  return (
    <div className="App">
      <header className="App-header">
        <p>Status: {isOnline ? "online" : "offline"}</p>
      <p>OS: {window.navigator.platform}</p> 

        <p>WEB:</p>
        <img src={imageUrl} className="App-logo" alt="web" />
        <p>OFFLINE (HARD DISK ):</p>
        {/* <img src="file:///Users/voorinc/Library/Application%20Support/itam/H124sSq.jpg" /> */}
        <img
          src="file:///Users/voorinc/Downloads/itam/H124sSq.jpg"
          className="App-logo"
          alt="web"
        />

        <p>OFFLINE (NEVER CONNECTED ):</p>
        <img src="red.jpg" className="App-logo" alt="logo" />

        {/* <img src='file:///Users/voorinc/Downloads/itam/H124sSq.jpg' className="App-logo" alt="logo" /> */}
      </header>
    </div>
  );
}

export default App;
