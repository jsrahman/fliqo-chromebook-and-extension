const { spawn } = require("child_process");

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

  const result = await send("Runtime.evaluate", {
    expression: `(async () => {
      try {
        await Promise.all([
          document.fonts.load("800 100px Fliqlo"),
          document.fonts.load("800 100px 'Barlow Condensed'"),
          document.fonts.load("700 100px 'Libre Baskerville'"),
          document.fonts.load("700 100px Ubuntu")
        ]);

        const fonts = [
          { id: "fliqlo", font: "800 128px Fliqlo" },
          { id: "barlow-condensed", font: "800 128px 'Barlow Condensed'" },
          { id: "libre-baskerville", font: "700 128px 'Libre Baskerville'" },
          { id: "ubuntu", font: "700 128px Ubuntu" }
        ];

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const out = {};

        for (const item of fonts) {
          ctx.font = item.font;
          const testDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "12", "58"];
          const stats = [];
          for (const d of testDigits) {
            const m = ctx.measureText(d);
            const glyphCenterAboveBaseline = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
            const emCenterAboveBaseline = (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
            const shiftDown = glyphCenterAboveBaseline - emCenterAboveBaseline;
            stats.push({
              digit: d,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
              glyphHeight: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
              fontAscent: m.fontBoundingBoxAscent,
              fontDescent: m.fontBoundingBoxDescent,
              shiftDownPx: shiftDown,
              shiftDownPct: (shiftDown / 128) * 100
            });
          }
          const avgShiftPct = stats.reduce((acc, s) => acc + s.shiftDownPct, 0) / stats.length;
          out[item.id] = {
            font: item.font,
            avgShiftPct,
            samples: stats.filter(s => ["0", "5", "8", "12"].includes(s.digit))
          };
        }
        return JSON.stringify(out);
      } catch (err) {
        return "ERROR: " + err.message + "\\n" + err.stack;
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Raw Response:\n", result.result.result.value);

  ws.close();
  chrome.kill();
}

run().catch(console.error);
