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

  const fontConfigs = [
    { id: "fliqlo", offset: "0.13em", name: "Fliqlo Original" },
    { id: "barlow-condensed", offset: "-0.048em", name: "Barlow Condensed" },
    { id: "libre-baskerville", offset: "0.041em", name: "Libre Baskerville" },
    { id: "ubuntu", offset: "-0.023em", name: "Ubuntu" }
  ];

  for (const font of fontConfigs) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const app = document.querySelector(".fliqlo-app");
        app.className = "fliqlo-app theme-classic text-white font-${font.id}";
        
        let style = document.getElementById("test-font-offset");
        if (!style) {
          style = document.createElement("style");
          style.id = "test-font-offset";
          document.head.appendChild(style);
        }
        style.innerHTML = \`
          .card-number {
            transform: translateY(${font.offset});
          }
        \`;

        // Set test numbers
        const topNums = document.querySelectorAll(".card-half.top .card-number");
        const bottomNums = document.querySelectorAll(".card-half.bottom .card-number");
        topNums[0].textContent = "12";
        bottomNums[0].textContent = "12";
        topNums[1].textContent = "48";
        bottomNums[1].textContent = "48";
      })()`
    });

    await new Promise(r => setTimeout(r, 500));

    const shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`/tmp/test_font_${font.id}.png`, Buffer.from(shot.result.data, "base64"));
    console.log(`Saved screenshot for ${font.id} to /tmp/test_font_${font.id}.png`);
  }

  ws.close();
  chrome.kill();
}

run().catch(console.error);
