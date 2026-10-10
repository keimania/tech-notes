import os
import json
import re

def build():
    dir_path = os.path.dirname(os.path.abspath(__file__))
    
    part_files = [
        ('part01', 'PART 01. 소프트웨어 개발', '01_소프트웨어_개발.md', '소프트웨어의 본질, CS 전공 커리큘럼, SDLC 생명주기 및 AI 시대 개발자 역량'),
        ('part02', 'PART 02. 소프트웨어의 종류와 특징', '02_소프트웨어의_종류와_특징.md', '시스템/응용/미들웨어/임베디드 SW, 웹/앱/하이브리드 비교, 프론트-백엔드 및 PWA'),
        ('part03', 'PART 03. 개발 언어 및 프레임워크', '03_개발_언어_및_프레임워크.md', '언어 선택 기준, C/C++, 객체지향 4대 특성, Java/JVM, React 가상 DOM, Python, TS, GC'),
        ('part04', 'PART 04. 개발 필수 지식', '04_개발_필수_지식.md', '자료구조 & Big-O, 개발 용어 계층도, API vs OpenAPI, RESTful, 동기/비동기, Ajax, JSON/XML, 알고리즘'),
        ('part05', 'PART 05. 소프트웨어 공학', '05_소프트웨어_공학.md', '폭포수에서 애자일까지, CBD 방법론, 스크럼/칸반, DevOps 문화, CI/CD 파이프라인, 테스트, Git'),
        ('part06', 'PART 06. 컴퓨터 구조와 운영체제', '06_컴퓨터_구조와_운영체제.md', '폰 노이만 구조, 메모리 계층, 가상 메모리/페이징, 컨텍스트 스위칭, 커널, 프로세스 vs 스레드, 데드락'),
        ('part07', 'PART 07. 데이터베이스 기술', '07_데이터베이스_기술.md', 'DBMS와 RDBMS, ERD 설계, ACID 트랜잭션, B+Tree 인덱스 튜닝, 3-Tier 연동, NoSQL, 정규화, 백업'),
        ('part08', 'PART 08. 네트워크 기술', '08_네트워크_기술.md', '3-Way Handshake, DNS 질의, Web vs WAS, HTTP 캐시, TCP vs UDP, 브라우저 렌더링, 쿠키/세션/JWT, WebSocket'),
        ('part09', 'PART 09. 아키텍처', '09_아키텍처.md', '스타벅스 비유로 배우는 분산 시스템, Redis 캐싱, 모놀리스 vs MSA, 무중단 배포, API Gateway, 장애 대응'),
        ('part10', 'PART 10. 클라우드, 빅데이터, AI', '10_클라우드_빅데이터_인공지능.md', '클라우드와 Pets vs Cattle, AWS 핵심 서비스, IaaS/PaaS/SaaS, Docker와 K8s, 빅데이터 5V, LLM과 RAG')
    ]

    book_data = []
    total_chars = 0
    total_sections = 0

    for pid, title, fname, desc in part_files:
        fpath = os.path.join(dir_path, fname)
        if not os.path.exists(fpath):
            print(f"Warning: File {fname} not found!")
            continue

        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find H2 sections
        sections = []
        for line in content.splitlines():
            line_str = line.strip()
            if line_str.startswith('## '):
                sec_title = line_str[3:].strip()
                sections.append(sec_title)

        total_chars += len(content)
        total_sections += len(sections)

        book_data.append({
            'id': pid,
            'title': title,
            'filename': fname,
            'description': desc,
            'sectionCount': len(sections),
            'sections': sections,
            'content': content
        })

    out_js = os.path.join(dir_path, 'book-data.js')
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated book data for mobile reader\n')
        f.write('window.BOOK_METADATA = {\n')
        f.write(f'  title: "소프트웨어 엔지니어링 올인원",\n')
        f.write(f'  subtitle: "컴퓨터 기초 원리부터 최신 클라우드·인공지능 아키텍처까지",\n')
        f.write(f'  totalParts: {len(book_data)},\n')
        f.write(f'  totalSections: {total_sections},\n')
        f.write(f'  totalChars: {total_chars}\n')
        f.write('};\n\n')
        f.write('window.BOOK_DATA = ' + json.dumps(book_data, ensure_ascii=False) + ';\n')

    print(f"Built book-data.js successfully: {len(book_data)} parts, {total_sections} sections, {total_chars:,} chars.")

if __name__ == '__main__':
    build()
