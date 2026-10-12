# Домашние бэкапы БД

Linux-контейнеры в Docker Desktop на Windows: VPN Tailscale и клиент PostgreSQL 16.
Раз в 72 часа сохраняются **два последних успешных дампа** в named volume
`bdokeep_home_backups`. Путь к папке Windows не нужен. Docker volume хранится
на диске Docker Desktop и переживает пересоздание контейнеров.

## 1. Разовая настройка Tailscale

Создайте tailnet, затем настройте его policy (для отдельной сети бэкапов):

```json
{
  "tagOwners": {
    "tag:bdokeep-db": ["autogroup:admin"],
    "tag:bdokeep-backup": ["autogroup:admin"]
  },
  "grants": [{
    "src": ["tag:bdokeep-backup"],
    "dst": ["tag:bdokeep-db"],
    "ip": ["tcp:5432"]
  }]
}
```

В существующей сети добавьте теги и grant, **проверьте и уберите более широкие
разрешения, покрывающие эти устройства**: grants/ACL складываются, узкое правило
не отменяет существующее allow-all. Проверьте, что доступ разрешён только к 5432
и только домашнему backup-устройству.

Создайте два разных pre-approved, **не ephemeral** auth key: продовый с тегом
`tag:bdokeep-db`, домашний с тегом `tag:bdokeep-backup`. Для каждого можно использовать
одноразовый ключ. Tagged-устройства обычно имеют отключённый node-key expiry;
проверьте это в Machines. Auth key нужен для первой регистрации; `TS_AUTH_ONCE=true`
и постоянный state-volume сохраняют вход после перезапуска. После удаления
state-volume потребуется действующий auth key. Статический IP и проброс портов дома
не нужны; приложение Tailscale в Windows не нужно.

Справка: [Docker-параметры Tailscale](https://tailscale.com/docs/features/containers/docker/docker-params),
[auth keys](https://tailscale.com/docs/features/access-control/auth-keys).

## 2. Прод

В корневой `.env` добавьте:

```dotenv
TS_AUTHKEY=tskey-auth-production-key
BACKUP_DB_PASSWORD=distinct-long-backup-password
```

Из корня репозитория:

```sh
docker compose -f docker-compose.yml -f docker-compose.backup-vpn.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.backup-vpn.yml exec backup-vpn tailscale ip -4
```

Сохраните показанный адрес `100.x.y.z` для домашнего `.env`. При последующих
деплоях используйте оба Compose-файла. Основной Compose без override не требует
VPN-переменных и не создаёт backup-роль.

Существующий migrate-job после миграций и сидов создаёт/обновляет
`bdokeep_backup`: чтение `public` и `drizzle`, включая последовательности,
`BYPASSRLS`, без superuser, записи, создания БД/ролей и replication. Будущие
таблицы/последовательности владельца миграций тоже доступны на чтение.
Пароль роли обновляется при следующем запуске migrate-job.

PostgreSQL не публикуется на хосте. Userspace VPN принимает TCP 5432 только внутри
tailnet, проксирует его через loopback-порт 15432 в `db:5432`. VPN-контейнер
имеет отдельный сетевой namespace от БД: соединение проходит SCRAM-проверку,
а не попадает под доверенный localhost, используемый migrate-job.

## 3. Домашний ПК

Установите Docker Desktop, включите Linux containers и автозапуск.
Скопируйте репозиторий либо только папку `ops/home-backup`, откройте её в терминале.
Скопируйте `.env.example` в `.env` и заполните **три переменные**:

```dotenv
TS_AUTHKEY=tskey-auth-home-key
BACKUP_DB_HOST=100.x.y.z
BACKUP_DB_PASSWORD=same-backup-password-as-production
```

```sh
docker compose up -d --build
docker compose logs --tail=50 backup
```

VPN работает в userspace без privileged, TUN и установки клиента в Windows.
Backup-контейнер делит сетевой namespace с VPN и использует его SOCKS5 через
локальный TCP-прокси; пароль PostgreSQL остаётся отдельным от VPN-ключа.

Первый дамп создаётся сразу, следующие — через 72 часа после завершения
последнего успешного. После включения ПК просроченный бэкап запускается сразу.
Ошибка соединения/дампа повторяется через час. Ручной бэкап сбрасывает отсчёт
72 часов. Если Docker Desktop остановлен или ПК спит, бэкапы не выполняются.

## Команды дома

Из папки домашнего Compose:

```sh
# Ручной бэкап: использует уже запущенный VPN и прокси.
docker compose exec backup python3 /app/backup.py once
# Статус, размеры файлов и время следующего бэкапа (UTC).
docker compose exec backup python3 /app/backup.py status
# Полное восстановление в одноразовой изолированной БД.
docker compose run --rm --no-deps restore-check
# Экспорт последней копии в текущую папку, без бинарного pipe в PowerShell.
docker compose cp -L backup:/backups/latest.dump ./bdokeep.dump
```

Параллельные бэкапы запрещены файловой блокировкой. Проверка восстановления
тоже удерживает блокировку: при занятости команда завершится ошибкой, повторите
её после завершения текущей операции. Проверка создаёт необходимые для RLS policies
роли `anon`, `authenticated`, `bdokeep_app`, восстанавливает схему/данные и проверяет
чтение классов и журнала миграций. Она не запускает приложение, migrate или seed,
не подключается к проду (`network_mode: none`). Её anonymous PGDATA volume
удаляется вместе с контейнером при `--rm`. При аварийном выключении Docker
проверьте и удалите оставшийся **restore-check** контейнер вместе с его anonymous
volume; backup-volume не удаляйте.

## Ограничения хранения

- Дамп потоково пишется на диск в сжатом custom-формате. После успеха `pg_dump`
  проверяется оглавление `pg_restore --list`; это не заменяет полное восстановление.
- Публикация файла атомарная. Ротация удаляет старые дампы только после создания
  новой копии; после прерванного запуска `.partial` удаляется при следующем запуске.
- Хранятся два дампа. Пока пишется новый, нужно место под **третий**. `latest.dump`
  — symlink, дополнительную копию не занимает. Размер копий растёт только вместе
  с размером базы. Статус перезаписывается, логи ротируются.
- RAM: backup 256 MiB, каждый VPN 128 MiB; временная проверочная БД — 512 MiB.
  Логи каждого сервиса: до трёх файлов по 10 MiB.
- **`docker compose down -v` удалит бэкапы и VPN-состояние.** Для обычного
  выключения используйте `docker compose down` без `-v`.
- Сброс/удаление данных Docker Desktop тоже удалит volumes. Этот volume —
  дополнительная домашняя копия, а не защита от потери домашнего диска.
- Сохраняется одна БД `bdokeep`: схема, данные, sequences, миграции и ledger сидов.
  Пароли/глобальные роли PostgreSQL, код, `.env`, иконки и другие файлы вне БД
  в дамп не входят. Сохраняйте конфигурацию и репозиторий отдельно.

## Восстановление после потери продовой БД

Сначала экспортируйте дамп и выполните домашнюю проверку восстановления.
Для чистого PostgreSQL 16 создайте БД `bdokeep` и роли `anon`, `authenticated`,
`bdokeep_app` (NOLOGIN допустим до запуска migrate). Перенесите дамп на сервер:

```sh
# На новом сервере сначала запускается только db; она создаёт пустую bdokeep.
docker compose up -d db
docker compose exec db psql -h 127.0.0.1 -U postgres -d bdokeep -v ON_ERROR_STOP=1 -c 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE bdokeep_app NOLOGIN;'
docker compose cp ./bdokeep.dump db:/tmp/bdokeep.dump
docker compose exec db pg_restore -h 127.0.0.1 -U postgres -d bdokeep --exit-on-error --no-owner --no-acl /tmp/bdokeep.dump
docker compose exec db rm /tmp/bdokeep.dump
```

Восстанавливайте **в пустую БД, до первого запуска migrate/web**. Не запускайте
эту команду поверх живой продовой БД. После восстановления запускайте обычный
deploy с VPN override: migrate применит только недостающие миграции, синхронизирует
пароли и права ролей. Не сбрасывайте baseline и не удаляйте существующий продовый
volume. Перед переключением сайта проверьте актуальность контента.

## Проверки для разработчика

Из корня: `sh ops/home-backup/test.sh`. Нужны Docker и интернет для скачивания
образов/тестового npm-пакета. Скрипт поднимает только отдельный проект
`bdokeep-backup-check`, проверяет права роли/RLS, будущие таблицы, смену пароля,
реальные дампы, ротацию, неверный пароль, недоступную БД, SIGTERM и восстановление.
Unit-тесты также проверяют нехватку места, частичные файлы, блокировку, расписание
и SOCKS5-прокси. Тестовые контейнеры и volumes удаляются при выходе скрипта.
Продовая БД, домашние бэкапы и реальные VPN-ключи не используются.
