
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


export async function geocodeCEP(cep: string, tipo: 'Residencia' | 'Trabalho'): Promise<LocalCadastrado | null> {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) return null;

    try {
      
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        const addressData = await viaCepResponse.json();

        if (addressData.erro) {
            console.warn(`[GEO] CEP ${cepClean} não encontrado pelo ViaCEP.`);
            return null;
        }

        const { logradouro, localidade, uf, bairro } = addressData;
       
 
        const fullAddress = `${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`;
        
        const simplifiedAddress = `${localidade}, ${uf}, Brasil`; 

        const addressesToTry = [fullAddress];

  
        if (fullAddress !== simplifiedAddress) {
             addressesToTry.push(simplifiedAddress);
        }

        let latitude: number | undefined;
        let longitude: number | undefined;

        for (const addressQuery of addressesToTry) {
            console.log(`[GEO] Tentando geocodificar CEP ${cepClean} com a query: ${addressQuery}`);
            
          
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1&countrycodes=br`;
            
            const geoResponse = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'SeuAppReactNative/1.0 (seu.email@exemplo.com)' 
                }
            });
            const geoData = await geoResponse.json();

            if (geoData.length > 0) {
         
                latitude = parseFloat(geoData[0].lat);
                longitude = parseFloat(geoData[0].lon);
                console.log(`[GEO] Sucesso na geocodificação para o CEP ${cepClean}.`);
                break; // Sai do loop
            }
        }
        


        if (latitude === undefined || longitude === undefined) {

             console.error(`[GEO] Geocodificação de Lat/Lon falhou para o CEP ${cepClean} após fallback.`);
             return null;
        }


        return {
            latitude: latitude,
            longitude: longitude,
            nome_local: tipo === 'Residencia' ? 'Residência' : 'Trabalho',
            cep: cepClean,
            endereco_nome: logradouro,
            municipio: localidade,
            uf: uf,
            pais: 'BR', 
            tipo_local: tipo,
        };

    } catch (error) {
        console.error(`[GEO] Erro inesperado na geocodificação do CEP ${cepClean}:`, error);
        return null;
    }
}