# UnityProject/

Placeholder. El proyecto Unity real se crea **desde el editor de Unity** (Unity Hub →
New Project → 2D), apuntando a esta carpeta, para que genere `Assets/`, `ProjectSettings/`
y `Packages/`.

## Estructura prevista una vez creado
```
Assets/
  Scripts/{Core, Residents, Relationships, Events, Dialogue, AI, Save, UI}
  ScriptableObjects/
  Prefabs/
  Scenes/
  Tests/
  Data/{residents_mock.json, items.json, events.json, dialogue_templates.json}
ProjectSettings/
Packages/
```
`Library/`, `Temp/`, `obj/`, `Build/` y los `*.csproj`/`*.sln` están ignorados por `.gitignore`.
