import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app shell", async () => {
  render(<App />);

  // "Stock Insights" appears in multiple places (brand + footer), so use an unambiguous query.
  expect(await screen.findByLabelText(/Global search/i)).toBeInTheDocument();
});
