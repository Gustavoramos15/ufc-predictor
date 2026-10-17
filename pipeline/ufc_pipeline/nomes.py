"""Normalização de nomes para cruzar atletas entre ESPN e UFCStats."""
import re
import unicodedata


def normalizar_nome(nome: str) -> str:
    """'Marc-André  Barriault' -> 'marc andre barriault'.

    Remove acentos, pontuação e espaços repetidos. Não tenta "adivinhar"
    grafias diferentes: se não bater exatamente, o atleta fica como não encontrado.
    """
    s = unicodedata.normalize("NFKD", nome or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("-", " ")
    s = re.sub(r"[^a-z0-9 ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def normalizar_espacos(texto: str) -> str:
    return re.sub(r"\s+", " ", texto or "").strip()
