import "./styles.css";
import { BidOrBustApp } from "./ui/app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

new BidOrBustApp(root);
