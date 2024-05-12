from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import pandas

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)

base_url = "https://www.cpf.gov.sg"
faq_url = f"{base_url}/member/faq/growing-your-savings/saving-as-an-employee"
driver.get(faq_url)

soup = BeautifulSoup(driver.page_source, 'html.parser')
faq_links = [(link.text.strip(), link['href']) for ul in soup.find_all('ul')
             for link in ul.find_all('a') if 'href' in link.attrs]

faq_contents = []
questions = []
answers = []
for question, link in faq_links:
    if link.startswith('/member/faq'):
        full_link = f"{base_url}{link}"
        driver.get(full_link)
        time.sleep(2)
        faq_soup = BeautifulSoup(driver.page_source, 'html.parser')
        faq_div = faq_soup.find('div', class_="cmp-teaser__description")
        if faq_div:
            faq_content = faq_div.get_text(strip=True)
            faq_contents.append((question, faq_content))
            questions.append(question)
            answers.append(faq_content)

for question, content in faq_contents:
    print(f"Question: {question}\nContent: {content}\n")

df = pandas.DataFrame({'questions': questions, 'answers': answers})
df.to_csv('faq_contents.csv', index=False)

driver.quit()

# TODO 
# - scrape the remainders of the FAQ pages
# - combine the scraped data into a single CSV file
# - future: scrape full html content of the FAQ pages, store and display exactly as scraped
# on the frontend
