---
layout: default
permalink: /projects
---

# Projects

I believe in learning through building. Whether it's [brain-slicing robots]({% post_url 2018-06-01-Brain-Slicing-Robots %}) for biotech research, [electronics for precision control systems]({% post_url 2017-05-15-AuxBoard %}), or [tiny houses from shipping containers]({% post_url 2016-08-15-tiny-house-post %}), making things teaches you how the world actually works.

## Major Projects

**[REAP Climate Center](https://www.reapcenter.org/) — Workforce Development (2024–)** — Building a workforce development program at REAP Climate Center to grow the talent pipeline for bio-regenerative and climate-adjacent careers. Part of leading $12M+ in grant initiatives.

**[Astraeus Ocean Systems](https://astraeusocean.com/) — Ocean Intelligence Platform (2024–)** — Co-founding Astraeus Ocean Systems and developing an Ocean Intelligence Platform: sustainable marine sensing and coastal monitoring infrastructure that turns raw ocean data into decisions for climate, conservation, and industry.

**[Island Lab](https://islandlab.dev) (2026–)** — Design group for rethinking systems.

**[Space ROS](https://space.ros.org/) (2025)** — Convened a working group with NASA on Space ROS, the open-source robotics framework being adapted for spaceflight. Helped shape how the broader robotics community contributes to standards for in-space and surface operations.

**[Brain Slicing Robots at 3Scan]({% post_url 2018-06-01-Brain-Slicing-Robots %}) (2013-2018)** — First employee at a biotech startup building automated digital pathology systems. Designed liquid handling systems, PCB layouts, and manufacturing processes that scaled from Arduino prototypes to production biomedical equipment.

**[AuxBoard Electronics]({% post_url 2017-05-15-AuxBoard %}) (2017)** — Designed Arduino-based control systems for biomedical equipment, managing water flow, temperature, and communications. Proved that accessible platforms like Arduino could power sophisticated scientific instruments with proper engineering.

**[The Halfway House]({% post_url 2016-08-15-tiny-house-post %}) (2016)** — Built a tiny house from a shipping container in a West Oakland warehouse with 14 other builders. Learned about space design, electrical systems, water management, and the reality that living in your construction project is a terrible idea.

**[Nairobi Lamp]({% post_url 2018-06-15-The-Nairobi-Lamp %}) (2011)** — Created locally-manufacturable lamps in Kenya using tin cans, hardwood, and cement. Taught electrical wiring and assembly skills as sustainable income opportunities, demonstrating appropriate technology principles.

**[Green Light]({% post_url 2016-10-18-Green-Light %}) (2016)** — Hydroponic growing experiments in mason jars — exploring what it means to participate in food production from a small apartment.

## Learning Spaces

**[TechShop]({% post_url 2014-08-10-TechShop %})** — Learned CNC machining, sheet metal fabrication, laser cutting, and [water jet cutting]({% post_url 2014-09-15-water-jet-sheet-metal %}). Access to industrial equipment democratized manufacturing and taught design for production principles.

**[Corrugated Underground](https://www.businessinsider.com/boxouse-bay-area-tiny-homes-2016-6)** — Tiny house building community in West Oakland. Shared tools, knowledge, and resources while [learning construction skills and alternative living approaches]({% post_url 2016-08-15-tiny-house-post %}).

**[3Scan Engineering]({% post_url 2018-06-01-Brain-Slicing-Robots %})** — Biotech hardware development from prototype to production. Learned about regulatory requirements, manufacturing scaling, and precision engineering for scientific applications.

## Philosophy

**Constraints drive creativity** — Limitations often lead to better solutions. Whether it's building with only local materials in Kenya or fitting everything into a shipping container, constraints force innovative thinking.

**Learn by failing** — The best education comes from projects that don't work the first time. Failed attempts teach more about materials, processes, and problem-solving than successful ones.

**Document everything** — Taking photos, writing notes, and sharing failures helps you remember lessons and contributes to community knowledge.

**Start with available tools** — Begin with what you have access to rather than waiting for perfect equipment. Arduino shields proved adequate for biomedical applications; shipping containers worked for housing experiments.

## Technical Skills Developed

**Electronics Design** — PCB layout, component selection, signal integrity, power management, manufacturing preparation. Experience with everything from prototyping to regulatory compliance.

**Mechanical Systems** — Precision machining, sheet metal fabrication, assembly processes, manufacturing constraints. Understanding how digital designs become physical objects.

**Software Integration** — Embedded systems, automation, data collection, user interfaces. Bridging hardware and software for complete system solutions.

**Manufacturing Processes** — Design for manufacturing, quality control, scaling from prototypes to production, working with contract manufacturers.

## Current Making

**Ocean Technology Development** — Through Astraeus Ocean Systems, developing marine monitoring and sustainable infrastructure systems. Applying years of hardware experience to environmental challenges.

**Climate Technology** — Supporting bio-regenerative programs at REAP Climate Center, understanding how technology can address environmental problems at scale.

**Tools and Planning Systems** — Building calendar and trip planning applications that help people organize complex projects and adventures.

## Making Community

**Skill Sharing** — Teaching electronics, fabrication, and project planning to others. The best way to learn something thoroughly is to teach it.

**Open Source Principles** — Sharing designs, documenting processes, contributing to community knowledge. Making is more powerful when knowledge flows freely.

**Cross-Disciplinary Learning** — The most interesting projects happen at intersections: biotech + electronics, sailing + community building, climate technology + business development.

## Materials and Methods

**Local Materials First** — Using available resources reduces costs, supports local economies, and often leads to more creative solutions.

**Rapid Prototyping** — Quick iteration cycles help test assumptions and refine designs. Better to build ten rough prototypes than spend months on one perfect design.

**User-Centered Design** — Understanding who will use what you're building and how it fits into their workflows and constraints.

**Systems Thinking** — Individual components matter less than how they work together as complete solutions.

## Lessons from Making

**Everything is more complex than it appears** — Simple objects involve sophisticated manufacturing, supply chains, and engineering decisions.

**Quality comes from process** — Consistent results require repeatable processes, clear documentation, and systematic quality control.

**Collaboration amplifies capability** — The best projects happen when different skills and perspectives combine around shared goals.

**Making changes how you see the world** — Understanding how things are built changes how you evaluate and interact with manufactured objects.

## Future Making

The intersection of climate technology, ocean systems, and community building offers rich opportunities for meaningful making. Projects that address environmental challenges while bringing people together around shared work.

*Making things with your hands changes how you understand the world. Every manufactured object becomes a puzzle to solve rather than magic to accept.*

## Project Logs

{% assign project_posts = site.posts | where: "type", "project" %}
{% for post in project_posts %}
- **{{ post.date | date: "%Y" }}** — [{{ post.title }}]({{ post.url | prepend: site.baseurl }}){% if post.short_description %} — {{ post.short_description }}{% endif %}
{% endfor %}