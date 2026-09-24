# **AMIHACKS** 

This packet presents three full-length, in-depth problem statements proposed for the AmiHacks hackathon. Each statement is deliberately kept comprehensive at this stage so the faculty panel can evaluate the complete scope, difficulty, and intent behind every track. Once approved, these will be condensed into participant-facing briefs for the event itself. 

|**TRACK A**|**TRACK B**|**TRACK C**|
|---|---|---|
|NGO / Social Impact|Industry / Open Innovation|Industry / Deep-Tech|
|**Surplus-to-Shelter**|**CityPulse**|**SentinelAPI**|
|Real-Time Food Rescu|e<br>The Live Civic Health|Zero-Trust API Vulnerability|
|Routing|Dashboard|Scanner|
|**Event**|AmiHacks||
|**Document status**|Draft -- Full-length version for approv|al (to be trimmed post-approval)|
|**Number of tracks**|3 (1 NGO/social-impact track, 2 indus|try/open-innovation tracks)|
|**Suggested duration**|24 hours||



**Team skill level** Mixed -- beginner-friendly entry point with an advanced ceiling in every track 

_Prepared by the AmiHacks organizing team for internal faculty circulation. Not for public distribution in this form._ 

### **Contents** 

- Track A -- Surplus-to-Shelter: Real-Time Food Rescue Routing (NGO / Social Impact) 

- Track B -- CityPulse: The Live Civic Health Dashboard (Industry / Open Innovation) 

- Track C -- SentinelAPI: Zero-Trust API Vulnerability Scanner (Industry / Deep-Tech) 

- Appendix -- Comparative Summary & Approval Checklist 

TRACK A · NGO / SOCIAL IMPACT 

## **Problem Statement-1: Surplus-to-Shelter: Real-Time Food Rescue Routing** 

_"Turn a restaurant's unsold food into a shelter's next meal -- before it hits the dumpster."_ 

|**Domain**|Food waste & surplus redistribution (industry + social-impact overlap)|
|---|---|
|**Difficulty**|Intermediate -- accessible entry point with real depth for advanced teams|
|**Duration**|24 hours | Tech stack: open / any|
|**Focus**|Social-impact-first, with genuine industry/logistics relevance|



### **1. Problem Statement** 

Every day, restaurants, grocery stores, caterers, and cafeterias generate surplus edible food that goes to waste -- not because no one wants it, but because there is no fast, reliable way to connect what is available, right now, nearby with who can pick it up and use it before it spoils. Food banks and shelters typically rely on phone calls, spreadsheets, or WhatsApp groups to coordinate donations, which breaks down at scale and under time pressure -- most surplus food has only a 2- 6 hour usable window. 

### **Who experiences it** 

- Food businesses (restaurants, grocers, caterers, campus dining) -- face disposal costs and lack an easy,compliance-friendly donation channel. 

- Food rescue nonprofits and shelters -- struggle to discover donations in time and lack routing/capacityvisibility. 

- Volunteer drivers -- have no unified dispatch system telling them where to go and when. 

### **Why it matters** 

Wasted food is simultaneously an environmental cost (landfill methane), an economic cost (disposal fees, lost tax-deduction opportunities), and a missed opportunity to address food insecurity in the same community that generated the surplus. 

### **Current limitations** 

Manual coordination does not scale, provides no real-time visibility into pickup capacity or expiry windows, and leaves no data trail for impact reporting or donor tax documentation. 

### **Why it is hard** 

This is not a CRUD app -- it requires real-time matching under time constraints, geographic routing optimization, trust/verification between parties who do not know each other, and handling messy, inconsistent data about food type, quantity, and safety windows. 

### **2. Target Users / Stakeholders** 

- Primary: Food donors (restaurants, grocers, campus dining halls), food rescue organizations 

- / shelters, andvolunteer or gig drivers. 

- Secondary: Local government / health departments (compliance, impact reporting), 

- corporate ESG teams,and food security researchers. 

### **3. Current Situation & Pain Points** 

- Coordination happens via phone, text, or spreadsheet -- slow, error-prone, and does not scale past ahandful of relationships. 

- No shared visibility into shelter capacity (can they even take 40 lbs of pasta tonight?). 

- No systematic tracking of quantity rescued -- hard to report impact or claim tax incentives. 

- Time-sensitive: food often expires as "safe to donate" before a match is found. 

- Trust gap: donors want assurance food will be picked up safely and used properly. 

### **4. Objective** 

Build a system that lets a food donor post a surplus item in under a minute, automatically matches it to the best-fit nearby recipient organization based on capacity, need, and distance, and coordinates pickup -- while capturing enough data to report measurable diversion impact. The how (matching algorithm, routing engine, UI approach) is left open to each team. 

### **5. Expected Solution Capabilities** 

- 1 Fast donation intake (donor posts item, quantity, expiry window, pickup location). 

- 2 Real-time matching of donation to the nearest / most-appropriate recipient organization. 

- 3 Driver / volunteer dispatch or routing suggestion. 

- 4 Capacity and preference management for recipient organizations. 

- 5 Status tracking (posted to matched to picked up to delivered). 

- 6 Basic impact dashboard (meals rescued, weight diverted, CO2e avoided). 

- 7 Notification system (SMS / email / push) for time-sensitive matches. 

- 8 Optional: food safety classification or expiry-risk scoring. 

### **6. Innovation Opportunities** 

- AI/ML: predict which donations are likely at specific times/locations to pre-position volunteers. 

- Agentic AI: an autonomous dispatch agent that negotiates pickup times between donor, recipient, anddriver. 

- Computer vision: classify food type/quantity from a photo instead of manual entry. 

- NLP: parse free-text donation descriptions into structured data. 

- Optimization / automation: multi-stop routing for drivers covering several pickups. 

- Data analytics: impact reporting, waste hotspot mapping. 

- Cloud: real-time geo-matching at scale. 

_Only use what is genuinely useful -- a well-executed matching engine beats a bolted-on AI feature._ 

### **7. Constraints & Considerations** 

- Safety: must respect food safety windows -- never route expired-risk food. 

- Privacy: donor/recipient location and contact data must be handled responsibly. 

- Reliability: time-sensitive -- a failed match wastes the food anyway. 

- Accessibility: interfaces usable by non-technical shelter staff and drivers. 

- Scalability: design should reasonably extend beyond one city. 

- Cost / latency: matching should be near-instant for a good demo experience. 

- Ethical: avoid creating friction that discourages small donors from participating. 

### **8. Hackathon Scope (24 Hours)** 

A working MVP is realistic within the timeframe: 

- Donor posts a surplus item with location and expiry. 

- System matches it to a recipient (rule-based or ML-based). 

- A driver/dispatch view shows the pickup. 

- A simple dashboard shows total meals rescued. 

- Advanced teams can add CV-based intake, optimized multi-stop routing, or an agentic dispatcher. 

