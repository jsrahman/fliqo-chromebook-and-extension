const { spawn } = require("child_process");
const fs = require("fs");

async function run() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--user-data-dir=/tmp/cdp-test",
    "http://localhost:4173"
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const listRes = await fetch("http://127.0.0.1:9222/json/list");
  const list = await listRes.json();
  const page = list.find(t => t.type === "page");
  
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) {
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.addEventListener("open", r));

  // Inject offset
  await send("Runtime.evaluate", {
    expression: `(() => {
      let style = document.getElementById("test-font-offset");
      if (!style) {
        style = document.createElement("style");
        style.id = "test-font-offset";
        document.head.appendChild(style);
      }
      style.innerHTML = \`
        .card-number {
          transform: translateY(0.13em);
        }
      \`;
    })()`
  });

  // Enable seconds so we see active flipping every second
  // Or trigger flip on the unit
  await send("Runtime.evaluate", {
    expression: `(() => {
      const saved = localStorage.getItem("fliqlo_clock_settings_v1");
      const current = saved ? JSON.parse(saved) : {};
      current.showSeconds = true;
      localStorage.setItem("fliqlo_clock_settings_v1", JSON.stringify(current));
      location.reload();
    })()`
  });

  // Wait for reload
  await new Promise(r => setTimeout(r, 2000));

  // Re-inject style after reload
  await send("Runtime.evaluate", {
    expression: `(() => {
      let style = document.getElementById("test-font-offset");
      if (!style) {
        style = document.createElement("style");
        style.id = "test-font-offset";
        document.head.appendChild(style);
      }
      style.innerHTML = \`
        .card-number {
          transform: translateY(0.13em);
        }
      \`;
    })()`
  });

  await new Promise(r => setTimeout(r, 1000));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/tmp/fliqlo_seconds_view.png", Buffer.from(shot.result.data, "base64"));
  console.log("Saved /tmp/fliqlo_seconds_view.png");

  ws.close();
  chrome.kill();
}

run().catch(console.error);
