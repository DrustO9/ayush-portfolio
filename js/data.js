// Single source of truth for all portfolio content.
// Both portfolio mode and 3D mode read from here (see DESIGN.md section 2).
// Images live in assets/img/<id>.jpg (preview), assets/img/hd/<id>.jpg (viewer) and
// assets/img/thumb/<id>.jpg, produced by tools/gen_ai_images.py.

export const person = {
  name: 'Ayush Kumar Maurya',
  first: 'Ayush',
  last: 'MAURYA',
  title: 'AI Engineering Portfolio',
  tagline: 'Intelligence, Engineered',
  // the 2D portfolio's opening, read top to bottom one line at a time
  flow: [
    'AI engineer at IIT Kharagpur',
    'Dual degree in Chemical + Financial Engineering, with a micro-specialisation in AI',
    'I build agents, RAG pipelines and ML systems that do real work, not demos',
    'Three internships · four projects · two national hackathons',
  ],
  years: '2023 – 2028',
  role: 'Dual Degree, Chemical + Financial Engineering · Micro-specialisation in AI · IIT Kharagpur',
  portrait: 'about-portrait',
  about: [
    'I am Ayush Kumar Maurya, an AI engineer studying for a five-year dual degree in Chemical and Financial Engineering at IIT Kharagpur, with a micro-specialisation in Artificial Intelligence and its Applications. I build systems where models stop being demos and start doing real work: agents that file reports, pipelines that ground an LLM in national guidelines, and classifiers that catch the 0.17% of transactions that matter.',
    'Most of my work sits where machine learning meets messy, high-stakes data: multi-agent workflows with LangGraph and n8n, RAG over policy documents with FAISS and Qdrant, and deep learning for markets, from LSTM option pricing to Transformers that trace sovereign-debt contagion.',
    'I care about the engineering around the model as much as the model itself: latency budgets, evaluation that does not leak, explainability with SHAP, and backends that hold up when real users arrive. Ranked 112th of 13,000 in HackerRank Orchestrate, a 24-hour agentic AI hackathon, and a finalist at the UCO Bank PSB Hackathon 2026.',
  ],
  education: [
    { years: '2023 – 2028', title: 'Dual Degree (B.Tech + M.Tech), Chemical & Financial Engineering', place: 'Indian Institute of Technology Kharagpur', note: 'CGPA 8.93 · Micro-specialisation in AI & Applications' },
    { years: '2022', title: 'Class XII, ISC', place: 'City Montessori School, Lucknow', note: '97.0%' },
    { years: '2020', title: 'Class X, ICSE', place: 'City Montessori School, Lucknow', note: '96.8%' },
  ],
  experience: [
    { years: 'May 2026 – Present', title: 'Research Intern', place: 'University of Oulu, Finland', note: 'Robot-interaction dashboard: 9 MongoDB aggregation pipelines, React/Recharts with SSE, AdaBoost/XGBoost anomaly detection.' },
    { years: 'Apr – Jun 2026', title: 'Research Intern', place: 'Dr B C Roy Multi-Speciality Medical Research Centre, IIT Kharagpur', note: 'Multi-agent FastAPI AI dietician with an ICMR-NIN RAG pipeline and LLM routing.' },
    { years: 'Apr – Jun 2026', title: 'Procurement Analytics Intern', place: 'Zepto, Bangalore', note: 'INR 6 Cr in savings from reverse-auction analysis; Databricks and Superset pipelines.' },
    { years: 'Aug 2025 – Jan 2026', title: 'AI Automation Engineer', place: 'ixana.ai, Bangalore', note: '6 AI workflows and 7+ API integrations: RCA, procurement, HR and scheduling agents.' },
    { years: 'Oct 2025 – Feb 2026', title: "Founder's Office Intern", place: 'With/Care Ventures', note: 'AI intelligence tool across 150+ trend signals in 12 sectors.' },
    { years: 'Jun – Aug 2025', title: "Founder's Office Intern", place: '360 Realtors LLP, Gurugram', note: 'Google Maps plotting platform (10 s a plot), GIS automation and an INR 47L build-vs-buy audit.' },
    { years: 'May – Jul 2025', title: 'Capital Markets Intern', place: 'SG Analytics (acquired by Straive)', note: '70 credit-profile factsheets for a Swiss bank with $190B+ AUM.' },
  ],
  awards: [
    'Finalist — UCO Bank PSB Hackathon 2026 (SAKHI alternative credit scoring)',
    'Ranked 112th of 13,000+ — HackerRank Orchestrate, 24-hour agentic AI hackathon',
    'Bharatiya Antariksh Hackathon 2026 (ISRO) — solar-flare early warning',
    'Gold Winner — Prodylitics 2024, IIM Indore, among 1,000+ teams',
    'Bronze Winner — NMIMS Moolyankan 2024, equity research',
    'Top 2% of 1,900+ students — department change to the Financial Engineering dual degree',
  ],
  software: ['Python', 'PyTorch', 'TensorFlow', 'HuggingFace', 'PEFT', 'LangChain', 'LangGraph', 'RAG', 'FAISS', 'Qdrant', 'OpenAI', 'Gemini', 'Groq', 'Llama', 'n8n', 'XGBoost', 'LightGBM', 'SHAP', 'FastAPI', 'Node.js', 'React', 'PostgreSQL', 'MongoDB', 'Redis', 'Databricks', 'C++'],
  contact: {
    email: 'ayush.maurya.iitkgp@gmail.com',
    links: [
      { label: 'Email', value: 'ayush.maurya.iitkgp@gmail.com', href: 'mailto:ayush.maurya.iitkgp@gmail.com' },
      { label: 'LinkedIn', value: 'linkedin.com/in/ayush-kumar-maurya', href: 'https://www.linkedin.com/in/ayush-kumar-maurya-065b14290/' },
      { label: 'GitHub', value: 'github.com/DrustO9', href: 'https://github.com/DrustO9' },
      { label: 'Institute email', value: 'ayushkumarmaurya@kgpian.iitkgp.ac.in', href: 'mailto:ayushkumarmaurya@kgpian.iitkgp.ac.in' },
    ],
  },
  pdf: { href: 'assets/Ayush-Kumar-Maurya-CV.pdf', size: '68 KB', label: 'CV' },
  signoff: "Let's build something intelligent.",
};

export const projects = [
  {
    id: 'school',
    number: '01',
    title: 'City Montessori School',
    type: 'Schooling · ICSE & ISC',
    location: 'Lucknow, Uttar Pradesh',
    category: 'Where it started',
    when: '2020 – 2022',
    detail: 'school',
    // his own card, the only image for this stop (hung whole on the building)
    hero: 'school-card',
    summary: 'City Montessori School, Lucknow: 96.8% in Class X (ICSE) and 97.0% in Class XII (ISC).',
    intro: [
      'My schooling was at City Montessori School in Lucknow, one of the largest schools in the world and a place that takes both academics and character seriously. I finished Class X under the ICSE board in 2020 with 96.8%, and Class XII under ISC in 2022 with 97.0%.',
      'CMS is where I first learned to enjoy hard problems for their own sake, and where competing, presenting and working in teams became habits rather than events. That foundation carried me to IIT Kharagpur.',
    ],
    sections: [
      {
        items: [
          { id: 'school-card', caption: 'City Montessori School, Lucknow — ICSE 96.8% (2020) · ISC 97.0% (2022)', kind: 'render' },
        ],
      },
    ],
  },
  {
    id: 'iit-kharagpur',
    number: '02',
    title: 'IIT Kharagpur',
    type: 'Dual Degree · Chemical + Financial Engineering',
    location: 'Kharagpur, West Bengal',
    category: '2023 – 2028',
    badge: 'assets/icons/iit-kgp.png',
    detail: 'iitkgp',
    hero: 'iit-card',
    summary: 'A five-year dual degree with a micro-specialisation in AI, CGPA 8.93, and a switch into Financial Engineering from the top 2% of 1,900+ students.',
    intro: [
      'At IIT Kharagpur I am in a five-year dual degree: a B.Tech (Hons.) in Chemical Engineering with an M.Tech in Financial Engineering, plus a micro-specialisation in Artificial Intelligence and its Applications. My CGPA is 8.93. I earned the move into the Financial Engineering dual degree by ranking in the top 2% of more than 1,900 students.',
      'Outside the classroom I am a founding team member and senior executive of the Innovation and Incubation Cell, where I organised VibeBuild, a 36-hour AI hackathon, and helped accelerate 30+ early-stage ventures. As Head of Sponsorship for the Chemical Engineering Association I raised INR 5L+ for Fugacity 2025, and as an Associate Manager at the Entrepreneurship Cell I secured INR 58L+ for the Global Entrepreneurship Summit 2025, hosting 50+ CXOs and 1,500+ attendees.',
    ],
    sections: [
      {
        items: [
          { id: 'iit-card', caption: 'IIT Kharagpur — Dual Degree, CGPA 8.93 · Top 2% of 1,900+ · Positions of responsibility', kind: 'render' },
        ],
      },
    ],
  },
  {
    id: 'zepto',
    number: '03',
    title: 'Zepto',
    type: 'Procurement Analytics Intern',
    location: 'Bangalore, Karnataka',
    category: 'Internship · Apr – Jun 2026',
    detail: 'zepto',
    hero: 'zepto-card',
    logo: 'logo-zepto',
    walls: ['zepto-spend', 'zepto-vendor'],
    summary: 'Procurement analytics at Zepto: INR 6 Cr+ in cost savings from scaling reverse auctions, 20% faster reporting, and weekly CFO savings dashboards.',
    intro: [
      'At Zepto I worked in the Procurement Centre of Excellence on spend analytics, executive reporting and vendor governance. I analysed bids from more than 30 historical reverse auctions and used that evidence to advise the CFO to scale the format, which realised over INR 6 crore in procurement cost savings.',
      'I built Databricks and Superset data pipelines tracking global spend, PO and PR workflows and vendor performance, which made reporting 20% faster, and weekly CFO dashboards for hard and soft savings. Along the way I validated external workforce requests and vendor procurement data.',
    ],
    sections: [
      {
        items: [
          { id: 'zepto-card', caption: 'Zepto — Procurement Analytics Intern, Apr – Jun 2026: INR 6 Cr+ saved, 20% faster reporting, weekly CFO dashboards', kind: 'board' },
          { id: 'zepto-spend', caption: 'Reverse auction analysis — 30+ historical events, one recommendation, INR 6 Cr+ realised', kind: 'board' },
          { id: 'zepto-vendor', caption: 'Vendor governance and executive reporting — from raw procurement data to the CFO desk', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'ixana',
    number: '04',
    title: 'ixana.ai',
    type: 'AI Automation Engineer',
    location: 'Bangalore, Karnataka',
    category: 'Internship · Aug 2025 – Jan 2026',
    detail: 'ixana',
    hero: 'ixana-card',
    logo: 'logo-ixana',
    walls: ['ixana-pm', 'ixana-procure'],
    repos: [
      { label: 'n8n-manufacturing-assistant-agent', href: 'https://github.com/DrustO9/n8n-manufacturing-assistant-agent', note: 'Procurement agent: MS Teams, OpenAI and Outlook with human approval' },
      { label: 'hr-policy-assistant', href: 'https://github.com/DrustO9/hr-policy-assistant', note: 'HR policy assistant core logic' },
      { label: 'n8n-ms-teams-hr-bot', href: 'https://github.com/DrustO9/n8n-ms-teams-hr-bot', note: 'Conversational HR bot for MS Teams in n8n' },
      { label: 'AgentCal', href: 'https://github.com/DrustO9/AgentCal', note: 'Bi-directional Google Calendar ⇄ Outlook sync on n8n + Supabase' },
    ],
    summary: 'Enterprise AI automation at ixana.ai: an n8n AI project manager that cut RCA reporting time by 90%, and procurement cycles 50% faster.',
    intro: [
      'At ixana.ai I designed enterprise AI automation for project governance, procurement and cross-functional operations. I deployed an n8n AI Project Manager across ClickUp and MS Teams for 34 users, cutting root-cause-analysis reporting time by 90% and saving 8.3 hours a week.',
      'I automated quotation parsing and purchase-order drafting with human-in-the-loop workflows, making procurement cycles 50% faster across more than 10 vendors. In all I engineered six AI workflows integrating 7+ APIs to automate capacity planning, with LLMs classifying issue patterns and scoring performance.',
      'The projects behind those numbers: a manufacturing procurement agent on n8n wiring MS Teams, OpenAI and Outlook together for quotation parsing, PO drafting and approval; an HR policy RAG assistant over India and US policies with semantic chunking, OpenAI embeddings and Qdrant; an AI project-management agent on ClickUp that writes RCAs and 12-sheet management reports and nudges people about incomplete updates; and a Google–Outlook calendar sync engine that reconciles creates, updates and deletes through Supabase snapshots.',
    ],
    sections: [
      {
        items: [
          { id: 'ixana-card', caption: 'ixana.ai — AI Automation Engineer, Aug 2025 – Jan 2026: 90% less RCA time, 50% faster procurement, 6 AI workflows', kind: 'board' },
          { id: 'ixana-pm', caption: 'AI project manager — n8n on ClickUp + MS Teams, 90% less RCA time, 8.3 h a week saved', kind: 'board' },
          { id: 'ixana-procure', caption: 'Procurement automation — quotes in, purchase orders out, 50% faster across 10+ vendors; plus other AI workflows', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'realtors-360',
    number: '05',
    title: '360 Realtors',
    type: "Founder's Office Intern",
    location: 'Gurugram, Haryana',
    category: 'Internship · Jun – Aug 2025',
    detail: 'realtors',
    hero: 'realtors-card',
    logo: 'logo-360-realtors',
    walls: ['realtors-audit', 'realtors-gis'],
    summary: "Founder's Office at 360 Realtors: in-house platforms for the legal and architecture teams, 10-second village plotting, and an INR 47L build-vs-buy decision.",
    intro: [
      "In the Founder's Office at 360 Realtors, a leading real-estate consulting firm, I engineered in-house platforms for its legal and architecture divisions. I audited land-management software and drafted feasibility reports that steered an INR 47 lakh procurement decision towards in-house engineering.",
      'I built a Google Maps-based platform that automated village mapping of 800–1,000 plots for 8 architects, cutting plotting time to 10 seconds a plot, and automated the GIS pipelines behind it with custom KML generation and centroid computation, replacing manual tracking.',
    ],
    sections: [
      {
        items: [
          { id: 'realtors-card', caption: "360 Realtors — Founder's Office Intern, Jun – Aug 2025: INR 47L decision, 10 s a plot, GIS pipelines", kind: 'board' },
          { id: 'realtors-audit', caption: 'Strategic initiative — land-management software audit that steered an INR 47L decision in-house', kind: 'board' },
          { id: 'realtors-gis', caption: 'GIS automation pipeline — survey data to KML, centroids and a Google Maps layer, 20x faster plotting', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'fraud-detection',
    number: '06',
    title: 'Credit Card Fraud Detection',
    type: 'Imbalanced learning · CTGAN + XGBoost',
    location: 'ULB dataset, self project',
    category: 'Project · May 2026',
    detail: 'fraud',
    group: 'projects',
    hero: 'fraud-card',
    walls: ['fraud-left', 'fraud-right'],
    summary: 'Finding 492 frauds among 284K transactions (0.17%): CTGAN + XGBoost reached 0.92 precision and 0.84 F1, beating SMOTE.',
    intro: [
      'The ULB credit-card dataset holds 492 frauds among 284,807 transactions, just 0.17%. I used it to study extreme class imbalance, benchmarking data-level and algorithm-level strategies: SMOTE oversampling, class weighting and CTGAN-generated frauds, each across logistic regression, random forests and XGBoost.',
      'I kept every resampling step inside the training folds so no synthetic data leaked into evaluation, and compared models on PR-AUC rather than accuracy. CTGAN with XGBoost came out best, with 0.92 precision and 0.84 F1, outperforming SMOTE-based oversampling.',
    ],
    sections: [
      {
        items: [
          { id: 'fraud-card', caption: 'Credit card fraud detection — 0.92 precision, 0.84 F1 at 0.17% positives', kind: 'board' },
          { id: 'fraud-left', caption: 'The dataset — 492 frauds in 284,807 transactions, a highly imbalanced problem', kind: 'board' },
          { id: 'fraud-right', caption: 'Results — precision–recall under heavy imbalance, CTGAN + XGBoost against SMOTE and class weights', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'spam-nlp',
    number: '07',
    title: 'SMS Spam Classification',
    type: 'Classical NLP to Transformers',
    location: 'Self project',
    category: 'Project · May 2026',
    detail: 'spam',
    group: 'projects',
    hero: 'spam-card',
    walls: ['spam-left', 'spam-right'],
    repos: [{ label: 'spam-email-classifier', href: 'https://github.com/DrustO9/spam-email-classifier', note: 'Classical pipeline: NLTK, TF-IDF, 8-model benchmark, voting and stacking ensembles' }],
    summary: 'Six text representations from bag-of-words to DistilBERT on 5,169 SMSs: Bi-LSTM reached macro-F1 0.982, DistilBERT 0.981.',
    intro: [
      'I studied the compute-versus-performance trade-off in text classification on 5,169 SMS messages, 13% of them spam. I benchmarked bag-of-words, TF-IDF, Word2Vec, GloVe, a Bi-LSTM and DistilBERT, pairing the classical representations with logistic regression, naive Bayes, random forests and a linear SVM, and evaluated everything on macro-F1.',
      'The Bi-LSTM scored best (F1 0.982), just ahead of DistilBERT (0.981), while TF-IDF with a linear SVM reached 0.971 for a fraction of the compute.',
    ],
    sections: [
      {
        items: [
          { id: 'spam-card', caption: 'SMS spam, classical NLP to transformers — Bi-LSTM 0.982, DistilBERT 0.981, TF-IDF + SVM 0.971 macro-F1', kind: 'board' },
          { id: 'spam-left', caption: 'The dataset — 5,169 SMS messages, 13% spam', kind: 'board' },
          { id: 'spam-right', caption: 'Results — macro-F1 by model and the compute vs performance trade-off', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'gan-augment',
    number: '08',
    title: 'Generative Image Augmentation',
    type: 'DCGAN for CIFAR-10 classification',
    location: 'Self project',
    category: 'Project · Jun 2026',
    detail: 'gan',
    group: 'projects-2',
    hero: 'gan-card',
    walls: ['gan-left', 'gan-right'],
    summary: 'A DCGAN that synthesises CIFAR-10 images (IS 5.2, FID 48) to augment a CNN classifier.',
    intro: [
      'I engineered a DCGAN, a ConvTranspose generator against a strided-CNN discriminator, to synthesise CIFAR-10 images and use them to augment the training set of a CNN classifier.',
      'The generated samples reached an Inception Score of 5.2 and an FID of 48, in line with baseline DCGAN performance on CIFAR-10.',
    ],
    sections: [
      {
        items: [
          { id: 'gan-card', caption: 'Generative image augmentation — DCGAN on CIFAR-10, IS 5.2, FID 48', kind: 'board' },
          { id: 'gan-left', caption: 'The dataset — CIFAR-10, 60,000 images in 10 classes at 32x32', kind: 'board' },
          { id: 'gan-right', caption: 'The model — a generator and a critic, and samples improving over training', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'forecasting',
    number: '09',
    title: 'Regression & Time-Series Forecasting',
    type: '8 models on 10 years of daily temperature',
    location: 'Course term project',
    category: 'Project · Apr 2026',
    detail: 'forecast',
    group: 'projects-2',
    hero: 'forecast-card',
    walls: ['forecast-left', 'forecast-right'],
    repos: [{ label: 'time-series-temp', href: 'https://github.com/DrustO9/time-series-temp', note: '8 models with ADF and VIF diagnostics' }],
    summary: 'Eight regression and time-series models on ten years of daily temperature; polynomial regression won with RMSE 2.279 and MAE 1.764.',
    intro: [
      'For a course term project I benchmarked eight regression and time-series models on ten years of daily temperature data. Before choosing a model I ran the diagnostics: the ADF test for stationarity, ACF and PACF plots for lag structure, lag features with seasonal terms, and VIF checks for multicollinearity.',
      'Polynomial regression gave the best seasonal forecasts, with RMSE 2.279 and MAE 1.764, outperforming OLS, Lasso, ARIMA and SARIMA.',
    ],
    sections: [
      {
        items: [
          { id: 'forecast-card', caption: 'The Climate Signal Lab — RMSE 2.279, MAE 1.764 with polynomial regression, 8 models benchmarked', kind: 'board' },
          { id: 'forecast-left', caption: 'The dataset — ten years of daily temperature, 3,652 points', kind: 'board' },
          { id: 'forecast-right', caption: 'Diagnostics first — ADF, ACF / PACF and VIF before choosing among eight models', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'sakhi',
    number: '10',
    title: 'SAKHI · UCO Bank PSB Hackathon',
    type: 'Finalist · alternative credit scoring',
    location: 'UCO Bank PSB Hackathon 2026',
    category: 'Competition · Apr 2026 – present',
    detail: 'sakhi',
    group: 'competitions',
    hero: 'sakhi-card',
    walls: ['sakhi-left', 'sakhi-right'],
    repos: [{ label: 'Sakhi_finance', href: 'https://github.com/DrustO9/Sakhi_finance', note: 'Backend, frontend and docs' }],
    summary: 'Finalist: SAKHI scores bureau-invisible borrowers from UPI data with LightGBM, then explains the score and suggests next steps through a chatbot.',
    intro: [
      'Millions of borrowers are invisible to credit bureaus. For the UCO Bank PSB Hackathon 2026, where SAKHI reached the finals, I designed SAKHI, an alternative credit-scoring framework built on UPI transaction behaviour.',
      'I generated 25,000 synthetic UPI profiles through probabilistic transaction simulation and trained a LightGBM credit model (AUC 0.674). On top of it I built a LangChain chatbot with Groq, Redis, SHAP, DiCE and voice workflows that explains each score and suggests personalised actions to improve it.',
    ],
    sections: [
      {
        items: [
          { id: 'sakhi-card', caption: 'SAKHI — alternative credit scoring for bureau-invisible borrowers: 25K UPI profiles, LightGBM AUC 0.674, SHAP + DiCE', kind: 'board' },
          { id: 'sakhi-left', caption: 'Context — beyond credit bureaus, 25,000 synthetic UPI profiles', kind: 'board' },
          { id: 'sakhi-right', caption: 'Explain and converse — SHAP, DiCE and a LangChain chatbot; UCO Bank PSB Hackathon 2026 finalist', kind: 'board' },
        ],
      },
    ],
  },
  {
    id: 'isro-solar',
    number: '11',
    title: 'Solar-Flare Early Warning',
    type: 'Bharatiya Antariksh Hackathon · ISRO',
    location: 'Bharatiya Antariksh Hackathon 2026',
    category: 'Competition · Jun 2026 – present',
    detail: 'isro',
    group: 'competitions',
    hero: 'isro-card',
    walls: ['isro-left', 'isro-right'],
    repos: [{ label: 'aditya-l1-pradan-download', href: 'https://github.com/DrustO9/aditya-l1-pradan-download', note: 'SoLEXS and HEL1OS data scripts and the exploration notebook' }],
    summary: 'Fusing Aditya-L1 SoLEXS and HEL1OS X-ray streams to warn of solar flares 10 minutes ahead: ROC-AUC 0.81, 85% recall, under 15% false alarms.',
    intro: [
      'For ISRO’s Bharatiya Antariksh Hackathon 2026 I worked on the solar-flare prediction gap. I fused the SoLEXS and HEL1OS X-ray streams from Aditya-L1, processing more than 10 million observations for real-time space-weather alerts.',
      'I engineered 24+ temporal features and benchmarked LightGBM, XGBoost and LSTM models with physics-informed losses and multimodal fusion. The result is a 10-minute early warning with ROC-AUC 0.81, 85% recall and a false-alarm rate under 15%, with every alert explained by SHAP.',
    ],
    sections: [
      {
        items: [
          { id: 'isro-card', caption: 'Solar-flare early warning — ROC-AUC 0.81, 85% recall, under 15% false alarms, 10 minutes ahead', kind: 'board' },
          { id: 'isro-left', caption: 'Data and instruments — Aditya-L1 SoLEXS and HEL1OS, 10M+ X-ray observations', kind: 'board' },
          { id: 'isro-right', caption: 'Physics + machine learning — LightGBM, XGBoost and LSTM ensemble, explained with SHAP', kind: 'board' },
        ],
      },
    ],
  },
];

// Stops that gather several entries: the buggy stops once and they stand on either side of the road
// (members in `projects` order; their `group` names the stop).
export const groups = [
  { id: 'projects', range: '06 – 07', title: 'Projects', type: 'Fraud detection · SMS spam', summary: 'Fraud detection by the sea, SMS spam on the hill side.' },
  { id: 'projects-2', range: '08 – 09', title: 'Projects', type: 'Generative augmentation · Forecasting', summary: 'GAN augmentation by the sea, forecasting on the hill side.' },
  { id: 'competitions', range: '10 – 11', title: 'Competitions', type: 'National hackathons', summary: 'SAKHI by the sea, the ISRO solar-flare warning on the hill side.' },
].map((g) => ({ ...g, members: projects.filter((p) => p.group === g.id).map((p) => p.id) }));

// The 2D portfolio's sections, in reading order. `bg` is an optional image (assets/bg/<file>) laid
// behind the whole section; without one the section's own colours carry it.
export const sections = [
  { id: 'education', title: 'Education', sub: 'Where the foundations were laid', members: ['iit-kharagpur', 'school'], bg: 'education.webp' },
  { id: 'internships', title: 'Internships', sub: 'Three companies, one thread: data that drives decisions', members: ['zepto', 'ixana', 'realtors-360'], bg: 'internships.webp' },
  { id: 'projects', title: 'Projects', sub: 'Machine learning, NLP and forecasting, built end to end', members: projects.filter((p) => p.group?.startsWith('projects')).map((p) => p.id), bg: 'projects.webp' },
  { id: 'competitions', title: 'Competitions', sub: 'National hackathons, built against the clock', members: projects.filter((p) => p.group === 'competitions').map((p) => p.id), bg: 'competitions.webp' },
];

export const img = (id) => `assets/img/${id}.jpg`;
export const imgHd = (id) => `assets/img/hd/${id}.jpg`;
export const imgThumb = (id) => `assets/img/thumb/${id}.jpg`;
