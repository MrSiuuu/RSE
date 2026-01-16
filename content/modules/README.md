# Structure des Modules

## Organisation

Chaque module est stocké dans un fichier JSON séparé :
- `module1.json` - Module 1 – Niveau Découverte
- `module2.json` - Module 2 – Niveau Intermédiaire (à venir)
- `module3.json` - Module 3 – Niveau Avancé (à venir)

## Structure JSON

Chaque module JSON contient :
- **Métadonnées** : id, title, duration, etc.
- **Sections** : Array de sections avec différents types

### Types de sections disponibles

1. **`welcome`** - Écran d'accueil avec objectifs
2. **`info`** - Contenu informatif (texte, listes)
3. **`quiz`** - Quiz de positionnement (questions Oui/Non)
4. **`concepts`** - Notions clés avec définitions
5. **`gestures`** - Liste de gestes RSE à sélectionner
6. **`testimonials`** - Témoignages
7. **`form`** - Formulaire (ex: première action RSE)
8. **`summary`** - Récapitulatif final

## Utilisation dans l'app

```typescript
// Charger un module
import module1 from '@/content/modules/module1.json';

// Accéder aux sections
const welcomeSection = module1.sections.find(s => s.id === 'welcome');
const quizSection = module1.sections.find(s => s.id === 'positioning-quiz');
```

## Avantages

✅ **Performance** : Chargement instantané (pas de requête BDD)
✅ **Versioning** : Contenu versionné avec Git
✅ **Flexibilité** : Structure JSON adaptée au contenu riche
✅ **Simplicité** : Facile à modifier et maintenir
✅ **Extensibilité** : Ajouter modules 2 et 3 = créer nouveaux fichiers JSON

## Questions du Quiz

Les questions du quiz sont dans le JSON mais les **réponses sont enregistrées en BDD** pour :
- Tracking des réponses
- Statistiques par code d'accès
- Analyse des résultats

## Migration future

Si besoin d'édition dynamique plus tard, on peut migrer vers BDD sans casser l'existant.
