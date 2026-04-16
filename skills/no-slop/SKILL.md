---
name: no-slop
description: When the user wants to enforce high-quality, slop-free AI writing. Use when the user mentions "no slop," "writing quality," "AI writing rules," "content standards," "stop writing like AI," "too generic," "sounds like ChatGPT," "filler words," "weasel words," "emdash," or "writing guidelines." Apply these rules to any content generation task including blog posts, documentation, landing pages, emails, and copy. These are non-negotiable quality standards for all AI-generated text.
metadata:
  version: 1.0.0
---

# No AI Slop Rules

These are non-negotiable. Violating any of them makes the output unusable.

1. **No emdashes.** The — character is banned. Use a semicolon, a period, or restructure the sentence.

2. **No unsourced statistics.** Every number must come from a real, citable source. If you cannot cite it, do not write it.

3. **No parenthetical clarifications in headings.** Trust the reader.

4. **No intensifiers.** "Extremely", "dramatically", "exceptionally", "significantly", "incredibly", "remarkably", "truly", "absolutely", "literally" are all banned. Prove it with a fact or cut the word.

5. **No hollow statements.** Every claim must end with a concrete, verifiable detail. If it cannot, delete the sentence.

6. **No repeated talking points.** Say it once. Duplicates are padding.

7. **Vary structure.** Three consecutive sections with identical layout is a pattern. Break it.

8. **Link without narrating the link.** Do not write "as we discuss on our X page." Make the relevant words a link and move on.

9. **No performative urgency without a reason.** "Don't wait" needs a consequence in the same sentence or it gets cut.

10. **No scare quotes on normal words.** Only use quotation marks for actual quotations from a named source.

11. **No filler phrases.** Banned: "In today's world", "It's important to note", "When it comes to", "At the end of the day", "In the realm of", "It goes without saying", "This is where X comes in", "Look no further", "Our team of experts."

12. **Never start a sentence with "Whether you're."**

13. **Write like a technician, not a copywriter.** Direct, specific, technical. If the sentence could appear on any competitor's page unchanged, it is too generic. Delete it or make it specific.

14. **No synthetic enthusiasm.** Do not add exclamation marks, "we're proud to", "we're passionate about", or "we love what we do." State what the thing does. The work speaks.

15. **No weasel words.** "Helps ensure", "may be able to", "can potentially"; either it does or it does not. Commit or cut.

16. **No narrative or dramatic headings.** Headings must be concrete and technical. Do not use narrative framing ("The [Concept] Trap"), thriller-style mystery ("The Hidden Danger", "The Silent Killer"), or clickbait structure ("Why X Destroys Y"). A heading describes what the section contains; it does not tease it. If a heading could work as a thriller chapter title, rewrite it. Banned heading patterns: (a) "The Verdict", "The Bottom Line", "The Takeaway", "Key Takeaways", "Final Thoughts", "In Summary", "Wrapping Up", "Our Take". (b) Any heading starting with "The" followed by a dramatic or abstract noun: "The Real Cost", "The Hidden Truth", "The Pricing Paradox." Rewrite as a concrete action or description. (c) If a heading starts with "The" and would still make sense as a magazine article title, it is too dramatic. Rewrite it.

17. **No fabricated case studies or scenarios.** Never write narrative case studies, past-tense stories, or specific hypothetical scenarios that read like real events. If illustrating a failure mode or concept, write it as a generic technical principle using conditional or descriptive language. Never invent specific numbers, percentages, or quantities to make a scenario feel real.

18. **No fabricated history.** All milestones, dates, and events must be sourced. Do not invent timelines, alter dates, or fabricate achievements.

19. **No hollow interactive features.** Never build, propose, or approve any interactive UI component (audio players, calculators, diagnostic tools, chatbots, sliders, quote generators, etc.) unless the underlying data, assets, or API endpoints already exist and are fully wired up. If the assets do not exist, the feature does not ship. Stub, mock, and placeholder interactive elements are banned from production.

20. **No fabricated attributions.** Never claim a source says something unless you have verified it by reading the actual content. Writing "[Source] recommends X" without verifying the source actually says that is fabrication. Every attribution must have a 1:1 match to verified source text. Do not conflate claims from different sources, combine assumptions with a specific URL, or guess what a source says based on its title.
