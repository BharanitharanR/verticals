# Publishing to the Marketplace

The marketplace page reads this directory directly from GitHub - there's no
build step and no submission form. To list a vertical, open a pull request
that adds one new folder here:

```
marketplace/
  your-vertical-slug/
    meta.json
    spec.pdf   (or spec.yaml / spec.yml)
    icon.png   (optional - square, shown on its card)
```

## `meta.json` format

```json
{
  "name": "Audio Book Junkie",
  "vertical_id": "audio-book-junkie",
  "tagline": "A WhatsApp audiobook subscription that reads your library aloud.",
  "author": "Bharani"
}
```

- `name` - display name shown on the card.
- `vertical_id` - must match the `vertical_id` inside `spec.pdf`/`spec.yaml`.
- `tagline` - one sentence, shown under the name.
- `author` - who built it, shown in the card footer.

## What happens after you push

Once merged to `main`, the marketplace page picks it up on its next load -
nothing else to run. A visitor who downloads `spec.pdf` installs it into
their own Adiyan the same way any vertical spec is applied: attach the file
to a WhatsApp message to their own Adiyan number, with a caption like
"apply this vertical spec", sent as one message (not a forward, and not a
separate follow-up text - the file and the instruction have to arrive
together).

## Before you open the PR

The spec file isn't validated automatically - review is manual, via the
pull request itself. Make sure:

- `vertical_id` is lowercase letters, numbers, and hyphens only.
- Every constant your spec sets is one Adiyan's own vertical-spec skill
  actually supports (`summon_phrase`, `card_description`,
  `business_persona_context`, `strict_grounding` - see the
  `adiyan-vertical-spec` Agent Skill for the full, current list).
- The PDF (if that's your chosen format) is real, parseable text - not a
  scanned image. `pypdf`'s `extract_text()` is what actually reads it on
  the installing side; if that can't get clean text back out, neither can
  anyone who downloads it.
