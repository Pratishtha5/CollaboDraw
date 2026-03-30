# CollaboDraw Project Structure

This document is a quick navigation guide for contributors.
It reflects the current repository layout and where to add changes.

## Top-Level

```
CollaboDraw/
├─ src/                         # Application source and tests
├─ scripts/                     # Local run helpers (PowerShell)
├─ .env.example                 # Environment template
├─ Dockerfile                   # Container build
├─ render.yaml                  # Render deployment blueprint
├─ pom.xml                      # Maven project definition
├─ mvnw / mvnw.cmd              # Maven wrapper scripts
├─ README.md                    # Main documentation
└─ PROJECT_STRUCTURE.md         # This file
```

## Backend (Spring Boot)

```
src/main/java/com/example/collabodraw/
├─ CollaboDrawApplication.java
├─ WhiteboardController.java
├─ config/
│  ├─ DatabaseConfig.java
│  ├─ WebConfig.java
│  └─ WebSocketConfig.java
├─ controller/                  # Web/MVC controllers
├─ exception/                   # Global and custom exception handling
├─ model/                       # Entities and DTOs
├─ repository/                  # Data access layer
├─ security/                    # Security config and auth services
└─ service/                     # Business logic
```

## Frontend Assets and Views

```
src/main/resources/
├─ application.properties
├─ application-dev.properties
├─ collaborative_workspace_mysql.sql
├─ static/
│  ├─ auth.js
│  ├─ board-operations.js
│  ├─ sidebar-toggle.js
│  ├─ whiteboard.js
│  ├─ images/
│  └─ js/
│     └─ collab-socket.js
└─ templates/
   ├─ auth.html
   ├─ home.html
   ├─ mainscreen.html
   ├─ my-content.html
   ├─ settings.html
   ├─ shared.html
   └─ templates.html
```

## Tests

```
src/test/java/com/example/collabodraw/
├─ security/
├─ websocket/
└─ whiteboard/
```

## Where to Make Changes

- Add endpoint/controller logic: `src/main/java/com/example/collabodraw/controller/`
- Add business rules: `src/main/java/com/example/collabodraw/service/`
- Add DB queries/repositories: `src/main/java/com/example/collabodraw/repository/`
- Add websocket protocol changes: `src/main/java/com/example/collabodraw/config/WebSocketConfig.java` and `src/main/resources/static/js/collab-socket.js`
- Add page UI and templates: `src/main/resources/templates/`
- Add static client behavior: `src/main/resources/static/`
- Add tests: `src/test/java/com/example/collabodraw/`

## Contributor Notes

- Keep layers separated: controller -> service -> repository.
- Avoid committing secrets (`.env`, credentials, keys).
- Run tests before opening a pull request.
- Keep pull requests focused and small where possible.