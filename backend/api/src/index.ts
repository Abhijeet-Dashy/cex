import { config } from "./config.ts";
import app from "./app.ts";

const server = app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`, server.address());
});

server.on("error", (error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
