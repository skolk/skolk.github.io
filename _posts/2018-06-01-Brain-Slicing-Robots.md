---
layout: post
title: Building Brain Slicing Robots at 3Scan
date: 2018-06-01 00:00:00
categories: biotech engineering hardware
short_description: Six years building automated digital pathology systems, from prototype to production, and what I learned about scaling hardware in the biotech industry.
---

# Building Brain Slicing Robots at 3Scan

I worked on brain slicing robots for 6 years in San Francisco to better understand brains, cancer, and neurons. I worked mostly on liquid handling systems, which evolved into mechatronics, PCB design, and design for manufacturing once we scaled to about 20 units with a contract manufacturer.

It was an amazing experience, and I owe much of what I know about engineering and design to working with 3Scan (now Strateos).

## The Challenge

3Scan's mission was to automate digital pathology - essentially creating high-resolution 3D maps of biological tissue by precisely slicing samples and imaging each section. Traditional pathology involves a pathologist looking at a few 2D slices under a microscope. We wanted to image entire organs in three dimensions at cellular resolution.

The technical challenge was immense: slice tissue samples to 1-micron precision, image each slice, and reconstruct the 3D volume - all while maintaining the biological integrity of the samples.

## My Role: Liquid Handling Systems

While others worked on the imaging and slicing mechanisms, my focus was on the liquid handling systems that kept everything working:

**Water flow control:** Precise temperature and flow rate management for sample preparation and cleaning

**Chemical delivery:** Automated staining and processing solutions

**Filtration systems:** Removing debris and maintaining clean working environments  

**Temperature regulation:** Keeping biological samples at optimal temperatures

**pH monitoring:** Ensuring chemical processes stayed within required parameters

## From Arduino to Production

One of the most interesting aspects was our technology evolution. We started with Arduino-based prototypes - not typically used in precision biomedical tooling, but they worked. Rather than reinventing the processor, we made a functioning shield that accomplished everything we needed.

**The Arduino Shield:** I designed PCBs that turned Arduino Megas into precision biomedical controllers, managing multiple sensors, pumps, valves, and heating elements simultaneously.

**Scaling challenges:** Moving from hand-populated prototypes to PCBA (Printed Circuit Board Assembly) manufacturing taught me about design for manufacturing and the importance of testing at every scale.

**Contract manufacturing:** Working with external manufacturers to produce 20+ units required completely different thinking about documentation, quality control, and troubleshooting.

## Key Technical Learnings

**Test before scaling:** When working with parts too small to test specific IOs (like BGAs), use different packages before ordering populated versions of boards that might have untraceable issues.

**Component consistency:** I had issues with capacitors that weren't identical and had different tolerances - seemingly small differences that caused major headaches.

**Test points everywhere:** For complex boards, having test points or jumper connections is extremely helpful. The two exceptions: antennas and between clocks and ICs.

**Star grounding:** With multiple voltages (3.3V, 5V, 24V, and isolated analog signals), organizing the layout so all grounds meet at a relevant star point was a major design consideration.

**Analog/digital isolation:** Analog and digital signals must be isolated from each other, grounds included.

## The Biotech Context

Working in biotech taught me that hardware requirements are different from consumer electronics:

**Precision over cost:** When you're processing irreplaceable biological samples, reliability matters more than saving a few dollars on components.

**Regulatory considerations:** Everything needs to be documented and traceable for potential FDA approval.

**Interdisciplinary teams:** Success required constant collaboration between software engineers, biologists, mechanical engineers, and business development.

**Long development cycles:** Biotech moves slower than traditional tech - regulatory approval, customer validation, and technical complexity all extend timelines.

## From Prototype to Product

The journey from lab prototype to manufacturable product taught me about:

**Design for manufacturing:** What works in the lab doesn't always work on the factory floor

**Documentation:** External manufacturers need explicit instructions for everything

**Quality systems:** Automated testing becomes essential when you can't hand-tune every unit

**Supply chain management:** Biotech components often have long lead times and limited suppliers

## The Bigger Picture

3Scan was eventually acquired and became part of Strateos, where the technology continued to evolve. The experience taught me that building hardware for scientific applications requires a different mindset than consumer products - you're enabling discoveries that might not be possible any other way.

Working on brain slicing robots gave me deep appreciation for the complexity of both biological systems and the tools we build to understand them. Every technical challenge we solved opened up new possibilities for researchers studying cancer, neuroscience, and developmental biology.

*The best part wasn't the technology itself, but knowing that our work might help scientists make discoveries that could improve human health.*