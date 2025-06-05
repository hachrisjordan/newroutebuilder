# bbairtools

**bbairtools** is a modern Next.js web application designed to help users build, analyze, and manage flight routes efficiently. It provides advanced tools for route planning, award search, seat type delay analysis, and integrates comprehensive airport and airline data. The project leverages TypeScript, React Server Components, Tailwind CSS, and Shadcn UI for a robust, performant, and user-friendly experience.

---

## Features

### 1. Route Planning
- Intuitive interface for planning flight routes.
- Visualizes and manages complex itineraries.
- Integrates with a global airport and airline database.

### 2. Award Finder
- Search for award flight availability across multiple airlines.
- Filter and sort results by duration, departure, arrival, and cabin class (Economy, Premium Economy, Business, First).
- Reliability filtering: Exclude unreliable flights based on custom reliability metrics.
- Paginated, interactive results with detailed itinerary breakdowns.

### 3. Seat Type Delay Analysis
- Analyze delays by seat type across different routes and airlines.
- Visualize historical delay data to optimize travel planning.

### 4. Comprehensive Data
- Access to a global database of airports and airlines.
- Fast search and filtering for airports and airlines.
- Data validation and transformation using Zod and utility libraries.

### 5. User Profile & Settings
- User preferences for reliability thresholds and other settings.
- Secure authentication and profile management.

### 6. Modern UI/UX
- Responsive, mobile-first design using Tailwind CSS and Shadcn UI.
- Dark/light theme toggle.
- Optimized images and assets.

---

## Project Structure

- `src/app/` – Next.js pages and API routes (e.g., `/award-finder`, `/seat-type-delay`, `/settings`, `/dashboard`, `/auth`)
- `src/components/` – Reusable UI components (search, results cards, analysis tools, etc.)
- `src/lib/` – Utility functions and shared logic (data transformation, helpers)
- `src/types/` – TypeScript type definitions for strong type safety
- `src/data/` – Static data (e.g., airports database)
- `src/providers/` – React context providers (e.g., theme)
- `public/` – Static assets

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

---

## Technologies Used

- **Next.js** (App Router, SSR, RSC)
- **TypeScript** (strict typing)
- **React** (functional components, hooks)
- **Tailwind CSS** & **Shadcn UI** (modern, responsive UI)
- **Zod** (schema validation)
- **Jest** & **React Testing Library** (unit testing)
- **Supabase** (optional, for authentication and data)

---

## Contributing

- Follow the code style and structure guidelines in the repo.
- Write unit tests for new components and features.
- Document complex logic with JSDoc comments.

---

## License

MIT
