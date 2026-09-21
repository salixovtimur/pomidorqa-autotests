# Матрица покрытия

Покрытие считается от функциональных требований [`requirements.md`](../requirements.md), а не от числа
тестов и не от строк кода: PomidorQA тестируется как чёрный ящик, исходников продукта у набора нет,
code coverage измерить нечем.

| Статус | Что означает |
|---|---|
| `automated` | есть тест, который упадёт, если поведение сломается |
| `partial` | проверена наблюдаемая часть правила, серверная — нет |
| `known defect` | продукт расходится с требованием; тест написан по требованию и помечен `test.fail()` |
| `out of scope` | состояние недостижимо через интерфейсы продукта |

Срез: **21.09.2026**, стенд `https://aiqa.su/pomidorqa`. Прогон зелёный: 57 тестов, из них одно
ожидаемое падение по KD-1.

## Сводка

| Статус | Требований | Доля |
|---|---|---|
| `automated` | 42 | 84% |
| `partial` | 5 | 10% |
| `known defect` | 1 | 2% |
| `out of scope` | 2 | 4% |
| **Всего требований MVP** | **50** | 100% |

Статус определён у всех 50 требований. Основной пользовательский путь из критериев приёмки
(раздел 13 спецификации) закрыт целиком: все 6 шагов сквозным сценарием `e2e/booking-flow`
и `e2e/booking-cancel`. Из пяти негативных критериев приёмки три `automated` и два `partial` —
слот в прошлом и бронь собственного слота: до обоих серверных правил через интерфейс продукта
не добраться.

## Требования и тесты

### 3. Роли пользователей

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R3.1 | Гость просматривает каталог | `automated` | [guest-access](../tests/e2e/guest-access.spec.ts) |
| R3.2 | Гость открывает страницу участника и видит свободные слоты | `automated` | [guest-access](../tests/e2e/guest-access.spec.ts) |
| R3.3 | Гость не может забронировать звонок | `automated` | [guest-access](../tests/e2e/guest-access.spec.ts) |
| R3.4 | Приватные страницы гостю недоступны | `automated` | [guest-access](../tests/e2e/guest-access.spec.ts), [auth-flow](../tests/e2e/auth-flow.spec.ts) |
| R3.5 | Участник редактирует профиль и навыки | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts), [profile-skills](../tests/e2e/profile-skills.spec.ts) |
| R3.6 | Участник добавляет и удаляет свои слоты | `automated` | [slots-rules](../tests/e2e/slots-rules.spec.ts) |
| R3.7 | Участник бронирует слоты других | `automated` | [booking-flow](../tests/e2e/booking-flow.spec.ts), [booking-api](../tests/api/booking-api.spec.ts) |
| R3.8 | Отменить бронирование может и хост, и гость | `automated` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts) |
| R3.9 | Участник видит список своих встреч | `automated` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts), [booking-state](../tests/e2e/booking-state.spec.ts) |

### 4. Регистрация и вход

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R4.1 | Имя, email и пароль обязательны | `automated` | [auth-rules](../tests/e2e/auth-rules.spec.ts), [auth-flow](../tests/e2e/auth-flow.spec.ts) |
| R4.2 | Пароль не короче 8 символов | `automated` | [auth-rules](../tests/e2e/auth-rules.spec.ts), [slots](../tests/unit/slots.spec.ts) |
| R4.3 | После регистрации создан профиль: имя из формы, пояс `Europe/Moscow` | `automated` | [auth-flow](../tests/e2e/auth-flow.spec.ts) |
| R4.4 | Второй аккаунт на тот же email не создаётся | `automated` | [auth-flow](../tests/e2e/auth-flow.spec.ts), [booking-api](../tests/api/booking-api.spec.ts) |
| R4.5 | Ошибка входа одинаковая, без уточнения причины | `automated` | [auth-flow](../tests/e2e/auth-flow.spec.ts) |
| R4.6 | Успешный вход держит сессию, выход её закрывает | `automated` | [auth-flow](../tests/e2e/auth-flow.spec.ts) |

- R4.1 и R4.2 проверены на самом продукте: у полей формы стоят `required`, у пароля `minlength=8`,
  и браузер не отправляет форму, пока правило нарушено. Граница проверена с обеих сторон —
  семь символов форма отклоняет, ровно восемь принимает и пускает внутрь.

### 5. Профиль

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R5.1 | Имя — обязательное поле | `automated` | [auth-rules](../tests/e2e/auth-rules.spec.ts), [profile-flow](../tests/e2e/profile-flow.spec.ts) |
| R5.2 | Telegram — необязательный свободный текст | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts) |
| R5.3 | Часовой пояс выбирается из списка | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts), [slot-timezone](../tests/e2e/slot-timezone.spec.ts) |
| R5.4 | «О себе» — необязательное описание | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts), [public-profile](../tests/e2e/public-profile.spec.ts) |
| R5.5 | Время слотов показывается в часовом поясе владельца | `automated` | [slot-timezone](../tests/e2e/slot-timezone.spec.ts) |
| R5.6 | Профиль виден другим участникам | `automated` | [public-profile](../tests/e2e/public-profile.spec.ts), [catalog-search](../tests/e2e/catalog-search.spec.ts) |

- R5.1: проверено и сохранение имени, и отказ на пустом: форма профиля с пустым именем невалидна,
  а изменения соседних полей при этом не уезжают на сервер.

### 6. Навыки

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R6.1 | Навык имеет тип «могу помочь» или «хочу разобрать» | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts), [public-profile](../tests/e2e/public-profile.spec.ts) |
| R6.2 | Название навыка — свободный текст | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts) |
| R6.3 | Один и тот же навык одного типа нельзя добавить повторно | `automated` | [profile-skills](../tests/e2e/profile-skills.spec.ts) |
| R6.4 | Тот же навык другого типа — отдельная запись | `automated` | [profile-skills](../tests/e2e/profile-skills.spec.ts) |
| R6.5 | Участник удаляет свой навык в любой момент | `automated` | [profile-skills](../tests/e2e/profile-skills.spec.ts) |
| R6.6 | Пустой навык не добавляется | `automated` | [profile-flow](../tests/e2e/profile-flow.spec.ts) |

### 7. Слоты доступности

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R7.1 | Длительность слота фиксированная — 25 минут | `out of scope` | — |
| R7.2 | Нельзя создать слот в прошлом | `partial` | [slots-rules](../tests/e2e/slots-rules.spec.ts), [booking-api](../tests/api/booking-api.spec.ts) |
| R7.3 | У слота статус `free` или `booked` | `partial` | [slots-rules](../tests/e2e/slots-rules.spec.ts), [booking-state](../tests/e2e/booking-state.spec.ts) |
| R7.4 | Свой свободный слот можно удалить | `automated` | [slots-rules](../tests/e2e/slots-rules.spec.ts) |
| R7.5 | Забронированный слот удалить нельзя | `partial` | [slots-rules](../tests/e2e/slots-rules.spec.ts) |

- R7.1: время окончания слота нигде не выводится, наблюдаемо только начало. Подпись «25 минут» —
  текст макета, а не вычисленная длительность. Правило живёт в базе, в black-box доказать нечем.
- R7.3: сами строки `free` и `booked` в интерфейс не выводятся. Проверены наблюдаемые следствия:
  у свободного слота есть кнопка удаления и он стоит в календаре, забронированный теряет кнопку
  и пропадает из календаря. Что в базе лежит именно такой статус — доказать нечем.
- R7.2: покрыта клиентская валидация — браузер отклоняет прошедшую дату и форма не отправляется.
  До серверной проверки через интерфейс не добраться.
- R7.5: покрыто, что у забронированного слота пропадает кнопка удаления. Серверный отказ без
  запроса в обход интерфейса не проверить.

### 8. Каталог участников

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R8.1 | В каталоге только те, у кого есть свободный слот в будущем | `automated` | [catalog-rules](../tests/e2e/catalog-rules.spec.ts), [booking-state](../tests/e2e/booking-state.spec.ts) |
| R8.2 | Участник не видит себя в собственном каталоге | `automated` | [catalog-rules](../tests/e2e/catalog-rules.spec.ts) |
| R8.3 | Поиск фильтрует по навыкам из раздела «могу помочь» | **`known defect`** KD-1 | [known-defects](../tests/e2e/known-defects.spec.ts) |
| R8.4 | По неизвестному навыку выдача пустая | `automated` | [catalog-rules](../tests/e2e/catalog-rules.spec.ts) |

### 9. Страница участника

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R9.1 | Видны имя, «о себе», навыки обоих типов и свободные слоты | `automated` | [public-profile](../tests/e2e/public-profile.spec.ts), [guest-access](../tests/e2e/guest-access.spec.ts) |
| R9.2 | Забронированные слоты не показываются | `automated` | [booking-state](../tests/e2e/booking-state.spec.ts) |
| R9.3 | Прошедшие слоты не показываются | `out of scope` | — |

- R9.3: продукт не даёт создать слот в прошлом, а дождаться, пока существующий состарится,
  регрессия не может. Состояние недостижимо без подготовки данных в базе.

### 10. Бронирование звонка

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R10.1 | Свой слот забронировать нельзя | `partial` | [booking-api](../tests/api/booking-api.spec.ts) |
| R10.2 | Забронировать можно только свободный слот в будущем | `automated` | [booking-api](../tests/api/booking-api.spec.ts), [booking-flow](../tests/e2e/booking-flow.spec.ts) |
| R10.3 | После брони слот `booked`, бронирование `confirmed` | `automated` | [booking-state](../tests/e2e/booking-state.spec.ts), [slots-rules](../tests/e2e/slots-rules.spec.ts) |
| R10.4 | При гонке подтверждена ровно одна бронь, второй видит ошибку | `automated` | [booking-flow](../tests/e2e/booking-flow.spec.ts), [booking-api](../tests/api/booking-api.spec.ts) |
| R10.5 | Закрытие окна подтверждения не создаёт бронь | `automated` | [booking-state](../tests/e2e/booking-state.spec.ts) |

- R10.1: правило проверено запросом к локальному мок-серверу набора, а не к продукту. Через
  интерфейс PomidorQA свой слот забронировать не предлагают: себя в каталоге не видно, и до
  собственной страницы участника сценарий не доходит. Если продукт завтра разрешит бронь своего
  слота, этот тест останется зелёным — отсюда `partial`, а не `automated`.

### 11. Отмена бронирования

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R11.1 | Отменяет любой из двух участников | `automated` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts) |
| R11.2 | Отмена запрещена позднее чем за 2 часа до начала | `automated` | [cancel-window](../tests/e2e/cancel-window.spec.ts) |
| R11.3 | После отмены слот снова свободен и доступен другому | `automated` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts) |

### 12. Мои встречи

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R12.1 | Показаны брони, где участник хост или гость | `automated` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts) |
| R12.2 | Два списка: «Ближайшие» и «Прошедшие и отменённые» | `partial` | [booking-cancel](../tests/e2e/booking-cancel.spec.ts), [booking-state](../tests/e2e/booking-state.spec.ts) |
| R12.3 | Отменить можно только из «Ближайших» | `automated` | [booking-state](../tests/e2e/booking-state.spec.ts) |

- R12.2: проверено, что отменённая встреча уезжает из «Ближайших» в «Прошедшие и отменённые».
  Что в «Прошедшие» попадают именно состоявшиеся встречи, не проверено: слот в прошлом продукт
  создать не даёт, дождаться — регрессия не может. Та же причина, что у R9.3.

## Известные дефекты

Тест на дефект написан по требованию, а не по фактическому поведению, и помечен `test.fail()`.
Пока дефект жив, ожидаемый результат — падение, прогон остаётся зелёным. Когда продукт починят,
Playwright скажет «expected to fail, but passed» — сигнал снять пометку. Так дыра не исчезает
из отчёта и не превращается в зелёную галочку.

### KD-1 — каталог ищет по навыкам обоих типов

Требование R8.3 ограничивает поиск разделом «могу помочь». Фактически фильтр проходит по всем
навыкам участника: по запросу «Playwright» находится и тот, кто Playwright только хочет разобрать.

Почему это важно для пользователя: каталог отвечает на вопрос «кто мне поможет». Человек,
который сам ищет помощь по теме, в ответе на этот вопрос быть не должен — иначе бронь уходит
не тому, и встреча проходит впустую.

Решение за продуктом: сузить фильтр или переписать требование.

## Уровни проверок

| Уровень | Тестов | Что проверяет |
|---|---|---|
| unit | 10 | чистые функции набора: пересечение слотов, формат времени, валидация пароля |
| api | 8 | правила бронирования и регистрации на локальном мок-сервере |
| e2e | 39 | пользовательские сценарии в браузере на `aiqa.su/pomidorqa` |

Оговорка про пирамиду: unit-уровень здесь проверяет **собственный** код набора, а не продукт —
исходников PomidorQA нет. Широкое основание пирамиды во внешней автоматизации чёрного ящика
недостижимо, и это осознанный компромисс, а не недоработка. Правила брони, которые дешевле
проверять ниже интерфейса, вынесены на API-уровень.
