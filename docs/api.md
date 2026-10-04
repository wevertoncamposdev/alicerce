# API Export / OpenAPI

- Generated OpenAPI snapshot: `backend/openapi.json`
- To regenerate locally run (from repo root):

```bash
npm --prefix backend run export:openapi
```

- This script boots a Nest application in-memory and writes `openapi.json` to `backend/`.
