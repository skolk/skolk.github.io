---
layout: default
---
<div>
  <section>
    <h1>Sean Kolk</h1>
    <p>I make tools to help communities explore new horizons. Currently Director of Grant Strategy at <a href="#">REAP Climate Center</a> and Co-Founder of <a href="#">Astraeus Ocean Systems</a>, working on climate technology and ocean systems.</p>
    
    <p>I enjoy bringing people together in environments with interesting constraints. I seek the cold, water, and mountains.</p>
  </section>

  <section>
    <h2>Current Projects</h2>
    
    <p><strong>Climate Funding Strategy</strong> — Leading $12M+ in grant initiatives for bio-regenerative programs at REAP Climate Center.</p>
    
    <p><strong>Ocean Technology</strong> — Developing sustainable marine systems and coastal monitoring through Astraeus Ocean Systems.</p>
    
    <p><strong>A Path into Sailing</strong> — Writing a guide for people interested in getting into sailing, from basic skills to charter adventures around the world.</p>
    
    <p><strong>Adventure Report</strong> — Monthly storytelling breakfast running since 2014, bringing together people to share adventure stories.</p>
    
    <p><strong>Boatless Sailing</strong> — Organizing charter sailing expeditions for people who don't own boats. Next trip in planning.</p>
  </section>

  <section>
    <h2>Latest</h2>
    {% assign latest_post = site.posts.first %}
    <p><strong>{{ latest_post.date | date: "%B %-d, %Y" }}</strong> — <a href="{{ latest_post.url }}">{{ latest_post.title }}</a></p>
    <p>{{ latest_post.short_description }}</p>
    
    <p><a href="/log">All log entries →</a></p>
  </section>

  <section>
    <h2>Explorations</h2>
    <p><a href="/sailing">Sailing</a> — Charter adventures around the world, from the Seychelles to Croatia</p>
    <p><a href="/making">Making</a> — Building things from brain-slicing robots to tiny houses</p>
    <p><a href="/mountaineering">Mountaineering</a> — Peaks climbed from Yosemite to Uganda</p>
  </section>
</div>