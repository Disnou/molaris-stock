# 🧪 MolarisStock - Sistema de Gestão Laboratorial / Laboratory Management System

*(English version below)*

Um sistema Full-Stack responsivo desenvolvido para o controle rigoroso, seguro e bilíngue de reagentes e insumos laboratoriais. 

## 🚀 Funcionalidades

* **Autenticação Segura:** Sistema de login e cadastro de cientistas.
* **Gestão de Estoque:** Controle de entrada (reposição) e saída (baixa) de lotes.
* **Inteligência de Negócio:** Alertas visuais automáticos para estoque crítico e lotes vencidos.
* **Internacionalização (i18n):** Interface nativa bilíngue (Português / Inglês).
* **Exportação de Dados:** Geração de relatórios de inventário em formato `.csv`.
* **Design Responsivo:** Interface Cyberpunk adaptada para uso em desktops e dispositivos móveis (celulares/tablets).

## 🛠️ Tecnologias Utilizadas

* **Front-end:** HTML5, CSS3, JavaScript (Vanilla), Fetch API.
* **Back-end:** Node.js, Express, CORS.
* **Banco de Dados:** PostgreSQL (Tabelas relacionais, Constraints de integridade).

## ⚙️ Como executar o projeto localmente

1. Clone este repositório: `git clone https://github.com/Disnou/molaris-stock.git`
2. Configure o banco de dados PostgreSQL usando o script `laboratorio_dados.sql`.
3. Na pasta `molaris-stock-api`, instale as dependências: `npm install`
4. Crie um arquivo `.env` com suas credenciais do banco de dados (DB_USER, DB_PASS, etc).
5. Inicie o servidor backend: `node index.js`
6. Abra o arquivo `login.html` no seu navegador para acessar o sistema.

---

# 🧪 MolarisStock - Laboratory Management System

A responsive Full-Stack system developed for the rigorous, secure, and bilingual control of laboratory reagents and supplies.

## 🚀 Features

* **Secure Authentication:** Scientist login and registration system.
* **Inventory Management:** Control of batch entry (replenishment) and exit (usage).
* **Business Intelligence:** Automatic visual alerts for critical stock levels and expired batches.
* **Internationalization (i18n):** Native bilingual interface (Portuguese / English).
* **Data Export:** Generation of inventory reports in `.csv` format.
* **Responsive Design:** Cyberpunk interface adapted for desktop and mobile devices.

## 🛠️ Built With

* **Front-end:** HTML5, CSS3, JavaScript (Vanilla), Fetch API.
* **Back-end:** Node.js, Express, CORS.
* **Database:** PostgreSQL (Relational tables, Integrity constraints).

## ⚙️ How to run the project locally

1. Clone this repository: `git clone https://github.com/Disnou/molaris-stock.git`
2. Set up the PostgreSQL database using the `laboratorio_dados.sql` script.
3. Inside the `molaris-stock-api` folder, install dependencies: `npm install`
4. Create a `.env` file with your database credentials (DB_USER, DB_PASS, etc).
5. Start the backend server: `node index.js`
6. Open the `login.html` file in your browser to access the system.
