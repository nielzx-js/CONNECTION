export type LocalCadastrado = {
    latitude: number;
    longitude: number;
    nome_local: string;
    cep: string;
    endereco_nome: string;
    municipio: string;
    uf: string;
    pais: string;
    tipo_local: 'Residencia' | 'Trabalho';
};

export async function geocodeCEP(
    cep: string,
    tipo: 'Residencia' | 'Trabalho'
): Promise<LocalCadastrado | null> {

    const cepClean = cep.replace(/\D/g, '');

    if (cepClean.length !== 8) {
        console.warn("[GEO] CEP inválido:", cepClean);
        return null;
    }

    try {
       
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);

        if (!viaCepResponse.ok) {
            console.error("[GEO] Erro na requisição ViaCEP");
            return null;
        }

        const addressData = await viaCepResponse.json();

        if (!addressData || addressData.erro) {
            console.warn(`[GEO] CEP ${cepClean} não encontrado no ViaCEP.`);
            return null;
        }

        const logradouro = addressData.logradouro || "";
        const bairro = addressData.bairro || "";
        const localidade = addressData.localidade || "";
        const uf = addressData.uf || "";

        if (!localidade || !uf) {
            console.warn("[GEO] Localidade ou UF inválida.");
            return null;
        }

     
        const fullAddress = [logradouro, bairro, localidade, uf, "Brasil"]
            .filter(Boolean)
            .join(", ");

        const simplifiedAddress = `${localidade}, ${uf}, Brasil`;

        const addressesToTry = fullAddress !== simplifiedAddress
            ? [fullAddress, simplifiedAddress]
            : [fullAddress];

        let latitude: number | undefined;
        let longitude: number | undefined;

      
        for (const addressQuery of addressesToTry) {

            const nominatimUrl =
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1&countrycodes=br`;

            const geoResponse = await fetch(nominatimUrl, {
                headers: {
                    "User-Agent": "AppReactNative/1.0"
                }
            });

            if (!geoResponse.ok) continue;

            const geoData = await geoResponse.json();

            if (Array.isArray(geoData) && geoData.length > 0) {
                latitude = parseFloat(geoData[0].lat);
                longitude = parseFloat(geoData[0].lon);
                break;
            }
        }

        if (latitude === undefined || longitude === undefined) {
            console.error(`[GEO] Falha ao obter latitude/longitude para CEP ${cepClean}`);
            return null;
        }

        return {
            latitude,
            longitude,
            nome_local: tipo === 'Residencia' ? 'Residência' : 'Trabalho',
            cep: cepClean,
            endereco_nome: logradouro || localidade,
            municipio: localidade,
            uf,
            pais: "Brasil",
            tipo_local: tipo,
        };

    } catch (error) {
        console.error(`[GEO] Erro inesperado ao geocodificar CEP ${cepClean}:`, error);
        return null;
    }
}
