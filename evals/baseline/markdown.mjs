// Text placed inside a Markdown table cell.

/**
 * Escape `text` so it stays inside one cell of a GitHub-flavoured Markdown table. The
 * backslash is escaped with the pipe: escaping only the pipe turns `a\|b` into `a\\|b`, an
 * escaped backslash followed by a bare pipe that ends the cell.
 */
export const tableCell = (text) => text.replace(/[\\|]/g, "\\$&");
