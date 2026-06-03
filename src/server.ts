import app from "./app";
import config from "./config";
import { initDB } from "./db";

const port = config.port;
const main = () => {
  
  // database initialization
  initDB();
  // start the server
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};
main();