const { execSync } = require("child_process");
const path = require("path");
const root = (_path) => path.resolve(__dirname, "../..", _path);
const dirExist = (dir) => {
  const res = execSync(`[ -e "${dir}" ] && echo "yes" || echo "no"`).toString();
  console.log(res);
  return res === "yes";
};

console.log(dirExist(root("src")));
