# Taiga Vue

Taiga Vue is a web application for summarizing user stories from the Taiga project management platform. It allows you to view and export summaries in two ways:

- **By User Story:** See all user stories, their details, and point distribution.
- **By User:** See a summary of total points and story involvement for each user across all stories.

You can search, filter, and export the data as CSV or XLSX, with flexible options for project labeling and point sharing.

## Running the App in Development

To start the app in development mode (with hot reload):

```bash
npm install
npm run dev
```

This will start the Vite development server. Open the URL shown in your terminal (usually http://localhost:5173) in your browser.

## Building the App for Production

To build the app for production deployment:

```bash
npm run build
```

The built files will be output to the `dist/` directory. You can then deploy these files to your preferred static hosting service.

## Running Playwright Tests

The `tests` folder is ignored in the repository. To run Playwright tests, follow these steps:

1. **Copy the `tests` folder**
   - If you have a backup or received the `tests` folder separately, copy it into the project root directory so that you have a `tests/` directory alongside `package.json`.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright**
   ```bash
   npx playwright install
   ```

4. **Run the Playwright tests**
   ```bash
   npx playwright test
   ```

- Make sure your test files (e.g., `grc-point-input.spec.ts`) and user_stories.csv are inside the `tests/` directory.
- If you need to run a specific test file:
  ```bash
  npx playwright test tests/grc-point-input.spec.ts
  ```

For more information, see the [Playwright documentation](https://playwright.dev/).
