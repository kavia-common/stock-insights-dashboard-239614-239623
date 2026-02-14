import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders dashboard", async () => {
  render(<App />);
  expect(await screen.findByText(/Dashboard/i)).toBeInTheDocument();
});
