import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app shell", async () => {
  render(<App />);
  expect(await screen.findByText(/Stock Insights/i)).toBeInTheDocument();
});
