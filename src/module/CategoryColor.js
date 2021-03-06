import Configure from '../core/Configure';
import Parser from '../core/Parser';
import { getRandomColor, getContrastYIQ } from '../util/ColorManager';

export default { addSetting, apply };

const CATEGORY_COLOR = 'categoryColor';
const CATEGORY_COLOR_DEFAULT = {};

function addSetting() {
    const settingElement = (
        <>
            <label class="col-md-3">카테고리 색상 설정</label>
            <div class="col-md-9">
                <table class="table align-middle">
                    <colgroup>
                        <col width="40%" />
                        <col width="20%" />
                        <col width="20%" />
                        <col width="20%" />
                    </colgroup>
                    <thead>
                        <th>이름</th>
                        <th>뱃지색</th>
                        <th>배경색</th>
                        <th>굵게</th>
                    </thead>
                    <tbody />
                </table>
                <p>
                    더블 클릭으로 무작위 색상을 선택할 수 있습니다.
                </p>
            </div>
        </>
    );

    // 카테고리 목록 등록
    const boardCategoryElements = document.querySelectorAll('.board-category a');
    const tbody = settingElement.querySelector('tbody');

    for(const element of boardCategoryElements) {
        const name = element.textContent == '전체' ? '일반' : element.textContent;
        const tableCategoryElement = (
            <tr data-id={name}>
                <td><span class="badge badge-success" style="margin: .25em">{`${name}`}</span><span class="title">제목</span></td>
                <td><input type="text" name="badge" placeholder="000000" maxlength="6" /></td>
                <td><input type="text" name="bg" placeholder="000000" maxlength="6" /></td>
                <td><label><input type="checkbox" name="bold" style="margin: .25em" /> 적용</label></td>
            </tr>
        );
        if(name == '일반') {
            tableCategoryElement.querySelector('input[name="badge"]').disabled = true;
        }
        tbody.append(tableCategoryElement);
    }

    if(boardCategoryElements.length == 0) {
        tbody.append(<tr><td colspan="4"><center>카테고리를 확인할 수 없습니다.</center></td></tr>);
    }

    // 이벤트 핸들러
    tbody.addEventListener('keypress', event => {
        const regex = /[0-9a-fA-F]/;
        if(!regex.test(event.key)) event.preventDefault();
    });
    tbody.addEventListener('dblclick', event => {
        if(event.target.tagName != 'INPUT') return;
        if(event.target.disabled) return;

        const color = getRandomColor();
        const yiq = getContrastYIQ(color);

        if(event.target.name == 'badge') {
            event.target.value = color;
            event.target.closest('tr').querySelector('.badge').style.backgroundColor = `#${color}`;
            event.target.closest('tr').querySelector('.badge').style.color = yiq;
        }
        if(event.target.name == 'bg') {
            event.target.value = color;
            event.target.closest('tr').querySelector('td').style.backgroundColor = `#${color}`;
            event.target.closest('tr').querySelector('.title').style.color = yiq;
        }
    });
    tbody.addEventListener('input', event => {
        let color = '';
        let yiq = '';

        if(event.target.value.length == 6) {
            color = `#${event.target.value}`;
            yiq = getContrastYIQ(event.target.value);
        }

        if(event.target.name == 'badge') {
            event.target.closest('tr').querySelector('.badge').style.backgroundColor = color;
            event.target.closest('tr').querySelector('.badge').style.color = yiq;
        }
        if(event.target.name == 'bg') {
            event.target.closest('tr').querySelector('td').style.backgroundColor = color;
            event.target.closest('tr').querySelector('.title').style.color = yiq;
        }
        if(event.target.name == 'bold') {
            event.target.closest('tr').querySelector('.title').style.fontWeight = event.target.checked ? 'bold' : '';
        }
    });

    const channel = Parser.getChannelInfo().id;

    function load() {
        if(boardCategoryElements.length == 0) return;

        const colorConfig = GM_getValue(CATEGORY_COLOR, CATEGORY_COLOR_DEFAULT);

        if(!colorConfig[channel]) return;

        for(const element of tbody.children) {
            const category = element.dataset.id;
            if(colorConfig[channel][category]) {
                const row = tbody.querySelector(`tr[data-id="${category}"]`);
                const badge = colorConfig[channel][category].badge;
                const bgcolor = colorConfig[channel][category].bgcolor;
                const bold = colorConfig[channel][category].bold;

                const tdElement = row.querySelector('td');
                const badgeElement = row.querySelector('.badge');
                const titleElement = row.querySelector('.title');
                const badgeInput = row.querySelector('input[name="badge"]');
                const bgInput = row.querySelector('input[name="bg"]');
                const boldInput = row.querySelector('input[name="bold"]');

                badgeInput.value = badge;
                if(badge) {
                    badgeElement.style.backgroundColor = `#${badge}`;
                    badgeElement.style.color = getContrastYIQ(badge);
                }

                bgInput.value = bgcolor;
                if(bgcolor) {
                    tdElement.style.backgroundColor = `#${bgcolor}`;
                    titleElement.style.color = getContrastYIQ(bgcolor);
                }

                boldInput.checked = bold;
                if(bold) {
                    titleElement.style.fontWeight = 'bold';
                }
            }
        }
    }
    function save() {
        const colorConfig = GM_getValue(CATEGORY_COLOR, CATEGORY_COLOR_DEFAULT);
        const rows = tbody.querySelectorAll('tr');
        if(!colorConfig[channel]) {
            colorConfig[channel] = {};
        }

        for(const row of rows) {
            if(!colorConfig[channel][row.dataset.id]) {
                colorConfig[channel][row.dataset.id] = {};
            }
            colorConfig[channel][row.dataset.id].badge = row.querySelector('input[name="badge"]').value.toUpperCase();
            colorConfig[channel][row.dataset.id].bgcolor = row.querySelector('input[name="bg"]').value.toUpperCase();
            colorConfig[channel][row.dataset.id].bold = row.querySelector('input[name="bold"]').checked;
        }

        GM_setValue(CATEGORY_COLOR, colorConfig);
    }

    Configure.addSetting(settingElement, Configure.categoryKey.INTERFACE, save, load);
}

function apply() {
    const categoryConfig = GM_getValue(CATEGORY_COLOR, CATEGORY_COLOR_DEFAULT);
    const channel = Parser.getChannelInfo().id;
    const articles = Parser.queryItems('articles', 'board');

    articles.forEach(article => {
        const badgeElement = article.querySelector('.badge');
        const titleElement = article.querySelector('.title');

        if(!badgeElement || !titleElement) return;

        let badgeColor = '';
        let badgeYIQ = '';
        let bgColor = '';
        let bgYIQ = '';
        let bold = false;

        if(categoryConfig[channel] && categoryConfig[channel][badgeElement.textContent]) {
            badgeColor = categoryConfig[channel][badgeElement.textContent].badge;
            bgColor = categoryConfig[channel][badgeElement.textContent].bgcolor;
            bold = categoryConfig[channel][badgeElement.textContent].bold;
        }
        if(badgeColor != '') {
            badgeYIQ = getContrastYIQ(badgeColor);
            badgeElement.style.backgroundColor = `#${badgeColor}`;
            badgeElement.style.color = badgeYIQ;
        }
        if(bgColor != '') {
            bgYIQ = getContrastYIQ(bgColor);
            article.style.backgroundColor = `#${bgColor}`;
            article.style.color = bgYIQ;
        }
        if(bold) {
            article.style.fontWeight = 'bold';
        }
    });
}
