import {
  type RoasterBrewGuide as RoasterBrewGuideType,
  type BrewRecipe,
  BREW_METHOD_LABELS,
} from "@/lib/types/roaster-brew-guide";
import { Award } from "lucide-react";

interface RoasterBrewGuideProps {
  guide: RoasterBrewGuideType;
}

function RecipeSummary({ recipe }: { recipe: BrewRecipe }) {
  const parts: string[] = [];
  if (recipe.coffeeWeightG && recipe.waterWeightG) {
    parts.push(`${recipe.coffeeWeightG}g : ${recipe.waterWeightG}g`);
  }
  if (recipe.ratio) parts.push(recipe.ratio);
  if (recipe.grindSize) parts.push(recipe.grindSize);
  if (recipe.waterTempF) parts.push(`${recipe.waterTempF}\u00B0F`);
  if (recipe.totalBrewTime) parts.push(recipe.totalBrewTime);

  if (parts.length === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {parts.join(" \u00B7 ")}
    </p>
  );
}

function RecipeStepsTable({ recipe }: { recipe: BrewRecipe }) {
  if (!recipe.steps || recipe.steps.length === 0) return null;

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-1.5 pr-3 text-xs font-medium uppercase tracking-wide text-foreground/50">Step</th>
            <th className="text-left py-1.5 pr-3 text-xs font-medium uppercase tracking-wide text-foreground/50">Water</th>
            <th className="text-left py-1.5 pr-3 text-xs font-medium uppercase tracking-wide text-foreground/50">Time</th>
            <th className="text-left py-1.5 text-xs font-medium uppercase tracking-wide text-foreground/50">Notes</th>
          </tr>
        </thead>
        <tbody>
          {recipe.steps.map((step, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0">
              <td className="py-1.5 pr-3 font-medium text-foreground">{step.label}</td>
              <td className="py-1.5 pr-3 text-muted-foreground">{step.waterG ? `${step.waterG}g` : "\u2014"}</td>
              <td className="py-1.5 pr-3 text-muted-foreground">{step.timeStamp ?? "\u2014"}</td>
              <td className="py-1.5 text-muted-foreground">{step.notes ?? "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: BrewRecipe }) {
  const methodLabel = BREW_METHOD_LABELS[recipe.method] ?? recipe.method;

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <h4 className="text-sm font-semibold text-foreground">{methodLabel}</h4>
      <RecipeSummary recipe={recipe} />
      {recipe.notes && (
        <p className="mt-1 text-sm text-muted-foreground italic">{recipe.notes}</p>
      )}
      <RecipeStepsTable recipe={recipe} />
    </div>
  );
}

export function RoasterBrewGuide({ guide }: RoasterBrewGuideProps) {
  const hasRecipes = guide.recipes && guide.recipes.length > 0;
  const hasOriginNotes = !!guide.originNotes;
  const hasAccolades = guide.accolades && guide.accolades.length > 0;
  const hasTastingNotes = !!guide.roasterTastingNotes;

  if (!hasRecipes && !hasOriginNotes && !hasAccolades && !hasTastingNotes) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        {"Roaster\u2019s Brew Guide"}
      </h3>

      {hasAccolades && (
        <div className="flex flex-wrap gap-2">
          {guide.accolades!.map((accolade, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
            >
              <Award className="h-3 w-3" />
              {accolade}
            </span>
          ))}
        </div>
      )}

      {hasOriginNotes && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {guide.originNotes}
        </p>
      )}

      {hasRecipes && (
        <div className="grid gap-3">
          {guide.recipes!.map((recipe, i) => (
            <RecipeCard key={i} recipe={recipe} />
          ))}
        </div>
      )}

      {hasTastingNotes && (
        <blockquote className="border-l-2 border-foreground/20 pl-4 text-sm text-muted-foreground italic leading-relaxed">
          {guide.roasterTastingNotes}
        </blockquote>
      )}
    </div>
  );
}
