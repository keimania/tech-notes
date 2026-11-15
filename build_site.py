import os
import json
import re

def build():
    dir_path = os.path.dirname(os.path.abspath(__file__))
    
    part_files = [
        ('part01', 'PART 01. 소프트웨어 개발', '01_소프트웨어_개발.md', '소프트웨어의 본질, CS 전공 커리큘럼, SDLC 생명주기 및 AI 시대 개발자 역량'),
        ('part02', 'PART 02. 소프트웨어의 종류와 특징', '02_소프트웨어의_종류와_특징.md', '시스템/응용/미들웨어/임베디드 SW, 웹/앱/하이브리드 비교, 프론트-백엔드 및 PWA'),
        ('part03', 'PART 03. 개발 언어 및 프레임워크', '03_개발_언어_및_프레임워크.md', '언어 선택 기준, C/C++, 객체지향 SOLID, Java/JVM, React Fiber, 동시성 모델, Python, TS, GC'),
        ('part04', 'PART 04. 개발 필수 지식', '04_개발_필수_지식.md', '자료구조 & 해시테이블, 개발 용어 계층도, API vs OpenAPI, RESTful, 동기/비동기, CORS, JSON, 알고리즘'),
        ('part05', 'PART 05. 소프트웨어 공학', '05_소프트웨어_공학.md', '폭포수에서 애자일까지, 응집도/결합도, 스크럼/칸반, SRE & DevOps, CI/CD, 클린 아키텍처, 테스트, Git'),
        ('part06', 'PART 06. 컴퓨터 구조와 운영체제', '06_컴퓨터_구조와_운영체제.md', '파이프라이닝, 캐시 일관성(MESI), 가상 메모리/페이지 폴트, 스케줄링, 커널, IPC, CAS & 데드락'),
        ('part07', 'PART 07. 데이터베이스 기술', '07_데이터베이스_기술.md', '옵티마이저, 실전 ERD & UUID v7, ACID & MVCC, B+Tree 실행계획 튜닝, HikariCP & N+1, 샤딩, 백업'),
        ('part08', 'PART 08. 네트워크 기술', '08_네트워크_기술.md', 'TCP 혼잡제어, DNS & GSLB, Nginx 아키텍처, TLS 1.3, 렌더링 최적화, OAuth 2.0, epoll, WebSocket'),
        ('part09', 'PART 09. 아키텍처', '09_아키텍처.md', '1,000만 사용자 아키텍처 진화, 스타벅스 분산 시스템, Redis 스탬피드 방어, MSA & Outbox/CQRS, SRE'),
        ('part10', 'PART 10. 클라우드, 빅데이터, AI', '10_클라우드_빅데이터_인공지능.md', 'FinOps & VPC 설계, 리눅스 컨테이너 커널 원리, 프로덕션 Dockerfile & K8s, 레이크하우스, 추론형 LLM & RAG/MCP')
    ]

    book_data = []
    total_chars = 0
    total_lines = 0
    total_bytes = 0
    total_sections = 0

    full_book_path = os.path.join(dir_path, 'full_book.md')
    with open(full_book_path, 'w', encoding='utf-8') as full_out:
        full_out.write('# 📖 소프트웨어 엔지니어링 올인원 (Software Engineering All-in-One)\n\n')
        full_out.write('> 컴퓨터 기초 원리부터 최신 클라우드·인공지능 아키텍처까지, 단 1권으로 완성하는 개발자 필독서 (전면 심화 개정판)\n\n')
        full_out.write('---\n\n')
        full_out.write('## 📑 전체 목차 (Table of Contents)\n\n')
        for pid, title, fname, desc in part_files:
            full_out.write(f'- **{title}**: [{fname}]({fname}) — *{desc}*\n')
        full_out.write('\n---\n\n')

        for pid, title, fname, desc in part_files:
            fpath = os.path.join(dir_path, fname)
            if not os.path.exists(fpath):
                print(f"Warning: File {fname} not found!")
                continue

            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Clean any accidental raw LaTeX arrows
            content = content.replace(r'$\rightarrow$', '→').replace(r'$\to$', '→').replace(r'\rightarrow', '→')
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)

            # Find H2 sections
            sections = []
            lines = content.splitlines()
            for line in lines:
                line_str = line.strip()
                if line_str.startswith('## '):
                    sec_title = line_str[3:].strip()
                    sections.append(sec_title)

            bsize = os.path.getsize(fpath)
            total_chars += len(content)
            total_lines += len(lines)
            total_bytes += bsize
            total_sections += len(sections)

            print(f"[{pid.upper()}] {fname:28} : {len(lines):5,} lines | {len(content):7,} chars | {bsize:8,} bytes | {len(sections):2} H2 sections")

            book_data.append({
                'id': pid,
                'title': title,
                'filename': fname,
                'description': desc,
                'sectionCount': len(sections),
                'sections': sections,
                'content': content
            })

            full_out.write('\n\n---\n\n')
            full_out.write(content)
            full_out.write('\n\n')

    out_js = os.path.join(dir_path, 'book-data.js')
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated book data for mobile reader\n')
        f.write('window.BOOK_METADATA = {\n')
        f.write('  title: "소프트웨어 엔지니어링 올인원",\n')
        f.write('  subtitle: "컴퓨터 기초 원리부터 최신 클라우드·인공지능 아키텍처까지 (심화 개정판)",\n')
        f.write(f'  totalParts: {len(book_data)},\n')
        f.write(f'  totalSections: {total_sections},\n')
        f.write(f'  totalLines: {total_lines},\n')
        f.write(f'  totalChars: {total_chars}\n')
        f.write('};\n\n')
        f.write('window.BOOK_DATA = ' + json.dumps(book_data, ensure_ascii=False) + ';\n')

    print("================================================================================")
    print(f"TOTAL ACROSS 10 PARTS : {total_lines:,} lines | {total_chars:,} chars | {total_bytes:,} bytes ({total_sections} H2 sections)")
    print(f"full_book.md size     : {os.path.getsize(full_book_path):,} bytes")
    print(f"book-data.js size     : {os.path.getsize(out_js):,} bytes")
    print("================================================================================")

if __name__ == '__main__':
    build()
