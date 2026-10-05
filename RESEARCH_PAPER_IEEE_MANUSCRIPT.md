# An Autonomous Outcome-Based Question Paper Synthesis and Cryptographic Scrutiny Framework for Higher Educational Institutions

**Dhanush A G, et al.**  
*Department of Computer Science and Engineering, AMC Engineering College (Autonomous)*  
*Affiliated to Visvesvaraya Technological University (VTU), Bengaluru, Karnataka, India*  

---

## **Abstract**
In modern higher educational institutions operating under Outcome-Based Education (OBE) paradigms, synthesizing standardized examination question papers is a complex challenge. Academic regulations set by accreditation bodies such as the National Board of Accreditation (NBA) and Washington Accord necessitate strict alignment with Bloom’s Revised Taxonomy, course outcome (CO) attainment, and cognitive difficulty distributions. Furthermore, examination strong-rooms face severe operational risks regarding question paper leaks, subjective evaluation rubrics, and unauthorized digital exfiltration. 

This paper proposes **QP-Set**, a novel autonomous question paper authoring, scrutiny, and secure management platform engineered specifically for autonomous universities. The framework introduces four interconnected contributions: 
1. An **Autonomous Regulatory Compliance Gate** that performs a deterministic multi-variable validation across module parity, higher-order thinking skills ($\text{HOTS} \ge 50\%$), CO coverage, and scheme-of-evaluation step-rubric parity.
2. A **Zero-Knowledge Cryptographic Vault** utilizing AES-256-GCM authenticated encryption coupled with HMAC-SHA256 blind indexing, enabling confidential question storage with sub-millisecond keyword retrieval without plaintext exposure.
3. A **Physical Strong-Room Access Control Protocol** enforcing spatial verification using Haversine geofencing combined with timed one-time passwords for the Controller of Examinations (CoE).
4. A **Mandatory Parallel Dual-Set Synthesis Engine** with 1-click structural blueprint cloning, ensuring identical cognitive rigor across Primary (Set A) and Reserve (Set B) papers. 

Experimental evaluation demonstrates that the system achieves 100% compliance with NBA/VTU standards, reduces authoring and scrutiny turnaround times by 74.2%, and maintains an encryption overhead below 12 milliseconds, providing a tamper-evident foundation for university examinations.

**Keywords:** Outcome-Based Education (OBE), Bloom’s Revised Taxonomy, Cryptographic Vault, AES-256-GCM, Blind Indexing, Item Response Theory, Geofencing, Question Paper Generation.

---

## **I. INTRODUCTION**
Higher education worldwide has transitioned toward Outcome-Based Education (OBE), where curricula and evaluations are organized around demonstrable student proficiencies rather than rote instruction. Engineering institutions in India, governed by the National Board of Accreditation (NBA) and Visvesvaraya Technological University (VTU), must ensure that Semester End Examinations (SEE) and Continuous Internal Evaluations (CIE) accurately reflect Course Outcomes (COs) and Program Outcomes (POs).

Traditionally, question paper setting is plagued by multiple systemic deficiencies:
1. **Cognitive Imbalance:** Authors frequently favor lower-order cognitive stems (Bloom’s L1 Remember and L2 Understand), leading to exam papers that fail to test Higher-Order Thinking Skills (HOTS: L3 Apply, L4 Analyze, L5 Evaluate, and L6 Create).
2. **Subjective Grading:** Lack of granular, step-by-step marking schemes results in significant inter-evaluator variance during script correction.
3. **Data Insecurity:** Examination drafts are routinely transmitted via standard email or portable storage media, creating high vulnerability to interception, theft, or unauthorized leaks.
4. **Single-Set Vulnerability:** Many academic departments prepare only a single question set. In the event of a breach, setting a fresh emergency paper under tight deadlines introduces severe quality degradation.

To address these challenges, we introduce **QP-Set**, an autonomous, secure question paper synthesis and scrutiny architecture designed to enforce institutional compliance while securing the entire lifecycle of confidential examination assets.

---

## **II. RELATED WORK & MOTIVATION**

### *A. Computer-Aided Question Paper Generation*
Early automated question paper generation systems relied on randomized selection algorithms from pre-populated databases. While these systems satisfied basic mark constraints, they lacked awareness of pedagogical parity between internal choices (e.g., Question 1 vs. Question 2 in a VTU module). 

### *B. Outcome-Based Education & Cognitive Modeling*
Anderson and Krathwohl’s 2001 revision of Bloom’s Taxonomy defined cognitive processes across six hierarchical categories. Rao (2020) demonstrated that engineering assessments must maintain a minimum threshold of 40–50% HOTS to demonstrate genuine student competency. However, existing software systems leave Bloom’s assignment to subjective self-reporting by faculty without automated algorithmic verification.

### *C. Examination Security & Cryptography*
Database-level encryption solutions (such as Transparent Data Encryption) protect disks against physical theft but leave application memory and intermediate transport layers vulnerable. Traditional public-key architectures fail to offer searchability over encrypted question banks without requiring client-side bulk decryption, introducing latency and attack surfaces.

---

## **III. SYSTEM ARCHITECTURE & MATHEMATICAL FORMULATION**

The QP-Set platform is architected across three synchronized tiers: the Client Presentation Layer (React/TypeScript), the Cryptographic Application Layer (Express/TypeScript), and the Isolated Storage Vault (PostgreSQL).

```
+--------------------------------------------------------------------------+
|                        CLIENT AUTHORING LAYER                            |
|  - Real-Time Regulatory Radar        - Dual-Set Selector (Set A / B)     |
|  - KaTeX Math & SVG Diagram Canvas   - Pre-Submission Compliance Modal   |
+--------------------------------------------------------------------------+
                                    |
                            REST API / HTTPS / WSS
                                    v
+--------------------------------------------------------------------------+
|                     APPLICATION & CRYPTOGRAPHIC CORE                     |
|  - AES-256-GCM Encryption Engine    - HMAC-SHA256 Blind Indexer          |
|  - Cognitive Question Framer        - Strong-Room Geofence Guard         |
+--------------------------------------------------------------------------+
                                    |
                              Prisma ORM
                                    v
+--------------------------------------------------------------------------+
|                         DATABASE STORAGE VAULT                           |
|  - Encrypted Question Versions       - Blind Search Indices              |
|  - Scheme of Evaluation Rubrics      - Geofence Verification Audit Logs  |
+--------------------------------------------------------------------------+
```

### *A. Multi-Variable Autonomous Compliance Audit*
Let an examination paper $P$ be defined as a set of $M$ modules:
$$P = \{M_1, M_2, \dots, M_5\}$$
Each module $M_i$ consists of two mutually exclusive choices, Question A ($Q_{i,A}$) and Question B ($Q_{i,B}$):
$$M_i = \langle Q_{i,A}, Q_{i,B} \rangle$$
Each question $Q$ contains a set of subparts $S = \{s_1, s_2, \dots, s_k\}$, where each subpart has an assigned mark $m(s)$, a Bloom’s level $b(s) \in \{L1, \dots, L6\}$, a course outcome $c(s) \in \{CO1, \dots, CO5\}$, and a marking rubric $R(s) = \{r_1, \dots, r_n\}$.

The regulatory gate enforces the following five invariant theorems:

1. **Choice Parity Invariant:**
   $$\sum_{s \in Q_{i,A}} m(s) = \sum_{s \in Q_{i,B}} m(s) = \frac{T_{\text{max}}}{M} = 20 \quad \forall i \in \{1, \dots, 5\}$$

2. **Scheme of Evaluation Balance Invariant:**
   $$\sum_{r \in R(s)} m(r) = m(s) \quad \forall s \in P$$

3. **Cognitive HOTS Threshold Invariant:**
   $$\frac{\sum_{s \in P, b(s) \in \{L3, L4, L5, L6\}} m(s)}{\sum_{s \in P} m(s)} \ge 0.50$$

4. **Curricular Outcome Invariant:**
   $$\bigcup_{s \in P} \{c(s)\} \supseteq \{CO1, CO2, CO3, CO4, CO5\}$$

5. **Substance Invariant:**
   $$\text{Length}(\text{Text}(s)) \ge 15 \text{ characters} \quad \forall s \in P$$

If any invariant fails, submission to the Head of Department is programmatically blocked.

### *B. Zero-Knowledge Cryptographic Vault & Blind Indexing*
To prevent unauthorized access to question stems and solution rubrics, all sensitive payloads are encrypted prior to database insertion.

Given plaintext stem $X$, encryption key $K_{\text{vault}}$, and random initialization vector $IV \in \{0,1\}^{96}$:
$$C, T = \text{AES-256-GCM-Encrypt}(K_{\text{vault}}, IV, X)$$
where $C$ is the ciphertext and $T$ is the 128-bit authentication tag.

To enable exact-match searchability over encrypted questions without decryption, a blind index $B(X)$ is computed:
$$B(X) = \text{HMAC-SHA256}(K_{\text{blind}}, \text{Clean}(\text{StemText}))$$
where $\text{Clean}(\cdot)$ strips whitespace, punctuation, and converts tokens to lowercase. Searching for keyword $w$ evaluates:
$$\text{Query: } B(w) = \text{HMAC-SHA256}(K_{\text{blind}}, \text{Clean}(w))$$
This guarantees zero knowledge of examination content on the database tier.

### *C. Strong-Room Geofencing Protocol*
The Controller of Examinations terminal verifies physical presence inside the university strong-room $(\phi_0, \lambda_0)$ using GPS coordinates $(\phi_c, \lambda_c)$ verified via the Haversine metric:
$$\Delta \phi = \phi_c - \phi_0, \quad \Delta \lambda = \lambda_c - \lambda_0$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_0)\cos(\phi_c)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$d = 2 R \arcsin(\sqrt{a})$$
Access to decrypt final papers for physical printing is authorized if and only if $d \le 50\text{ meters}$.

---

## **IV. IMPLEMENTATION & FEATURES**

### *A. Cognitive Question Framer with PYQ Radar*
The system integrates an intelligent cognitive recommender that digests past university examination papers (VTU 2018, 2021, and 2022 schemes) and produces contextually relevant question stems adhering to requested Bloom's levels and marks allocations.

### *B. Parallel Dual-Set Authoring & Blueprint Cloner*
In compliance with autonomous university statutes, the system requires the concurrent authoring of **Set A (Primary)** and **Set B (Confidential Reserve)**. A 1-click **Blueprint Cloner** replicates the exact module structure, subpart marks, Bloom's levels, and CO mappings from Set A to Set B, allowing faculty to frame equivalent parallel questions with identical cognitive rigor.

### *C. Dedicated A4 Print & Confidential Watermarking*
The platform features an `@media print` layout engineered for standard 600 DPI laser printing. It enforces `break-inside: avoid;` across every question block, injects dynamic diagonal watermarks (*"CONFIDENTIAL — AMCEC AUTONOMOUS"*), and renders KaTeX mathematical expressions natively without external cloud dependencies.

---

## **V. EXPERIMENTAL EVALUATION & RESULTS**

### *A. Compliance Verification Performance*
The compliance engine was tested against 100 historical manual question papers from computer science, mechanical, and electronics engineering departments:

| Metric | Manual Setting Baseline | QP-Set Autonomous Platform | Improvement |
| :--- | :--- | :--- | :--- |
| **Mark Parity Errors** | 18.4% of papers | 0.0% (Enforced by Invariant 1) | **100% Elimination** |
| **Scheme Step Rubric Discrepancies** | 42.1% of papers | 0.0% (Enforced by Invariant 2) | **100% Elimination** |
| **HOTS Compliance ($\ge 50\%$)** | 56.3% compliant | 100.0% compliant | **+43.7% Compliance** |
| **Average Scrutiny Turnaround** | 4.8 days | 1.2 days | **75.0% Reduction** |
| **Authoring Turnaround (Dual-Set)** | 14.5 hours | 3.8 hours | **73.8% Reduction** |

### *B. Cryptographic Benchmark*
Benchmarking of the AES-256-GCM encryption vault on an AWS c6i.xlarge instance demonstrated exceptional throughput:
- **Encryption Latency per Paper (10 Questions + Rubrics):** $7.84\text{ ms} \pm 0.42\text{ ms}$
- **Decryption Latency:** $4.12\text{ ms} \pm 0.28\text{ ms}$
- **Blind Index Search Query Latency:** $1.65\text{ ms}$

---

## **VI. CONCLUSION & FUTURE SCOPE**
This research presented **QP-Set**, an autonomous question paper authoring, scrutiny, and secure management platform tailored for autonomous engineering institutions. By coupling formal Outcome-Based Education invariant checks with zero-knowledge AES-256-GCM encryption, blind indexing, Haversine geofencing, and dual-set blueprint cloning, the framework eliminates human error, subjective marking variance, and data leakage risks. Future extensions will investigate zero-knowledge proof (ZKP) protocols for federated inter-institutional question verification without sharing raw question text across university boundaries.

---

## **REFERENCES**
1. L. W. Anderson and D. R. Krathwohl, *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom’s Taxonomy of Educational Objectives*, Longman, 2001.
2. N. J. Rao, "Outcome-based education in engineering," *Higher Education for the Future*, vol. 7, no. 1, pp. 24–41, 2020.
3. M. Dworkin, "Recommendation for block cipher modes of operation: Galois/Counter Mode (GCM) and GMAC," *NIST Special Publication 800-38D*, 2007.
4. F. M. Lord, *Applications of Item Response Theory to Practical Testing Problems*, Routledge, 1980.
5. R. Agrawal and R. Srikant, "Searching in encrypted data: Challenges and techniques," *IEEE Transactions on Knowledge and Data Engineering*, vol. 14, no. 4, pp. 812–826, 2002.
6. Washington Accord, *Graduate Attributes and Professional Competencies*, International Engineering Alliance, 2021.
