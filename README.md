# EventosGdgTarija

App pública de eventos de GDG Tarija (Angular 21 + Supabase). La base de datos se comparte con
[back-office-gdg-tarija](https://github.com/GDG-Tarija/back-office-gdg-tarija), que es dueño de
`supabase/` (migraciones, config y seed).

## Entorno local

Se desarrolla contra un **Supabase local** con datos ficticios, nunca contra producción, y siempre en
una rama creada desde `dev` (`main` no se toca: solo recibe releases `dev → main`). Requiere Docker
corriendo y back-office clonado al lado de este repo.

```bash
cd ../back-office-gdg-tarija && npm install && npm run db:start && cd -   # Supabase local
cp src/environments/environment.eg.ts src/environments/environment.ts      # apunta a local
npm install
npm start                                                                  # http://localhost:4200
```

Login con Google, cómo volverte SUPERADMIN y flujo de migraciones a producción:
`back-office-gdg-tarija/docs/entornos-supabase.md`.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
