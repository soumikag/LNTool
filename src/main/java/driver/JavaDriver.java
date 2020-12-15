package driver;

import ammonite.ops.Path;
import funcdiff.ParamCollection;
import lambdanet.TypeInferenceService;
import lambdanet.TypeInferenceService$;

import java.io.*;
import java.util.Scanner;

public class JavaDriver {
    public static void main(String[] args) {
        var api = lambdanet.JavaAPI$.MODULE$;
        var typeInfer = TypeInferenceService$.MODULE$;
        var workDir = api.pwd();


        var modelDir = api.joinPath(workDir,
                "models/newParsing-GAT1-fc2-newSim-decay-6");
        var paramPath = api.joinPath(modelDir, "params.serialized");
        var modelCachePath = api.joinPath(modelDir, "model.serialized");
        var modelConfig = api.defaultModelConfig();
        var parsedReposDir = api.joinPath(workDir, "data/parsedRepos");

        var modelNotEntered = true;
        Scanner myObj = new Scanner(System.in);

        while (modelNotEntered) {
            System.out.println("Enter model path");
            try {
                String line = myObj.nextLine();
                if (!line.isEmpty()) {
                    modelDir = api.joinPath(workDir, line+"/newParsing-GAT1-fc2-newSim-decay-6");
                    paramPath = api.joinPath(modelDir, "params.serialized");
                    modelCachePath = api.joinPath(modelDir, "model.serialized");
                    modelNotEntered = false;
                }
            } catch (Exception e) {
                System.out.println("Got exception: ${e.getMessage}");
                e.printStackTrace(System.out);
            }
        }

        var model = typeInfer.loadModel(paramPath, modelCachePath, modelConfig, 8, parsedReposDir);
        var predService = api.predictionService(model, 8, 5);

        var pc = ParamCollection.fromFile(paramPath);

        var ser = model;
        var baos = new ByteArrayOutputStream();
        try {
            var oos = new ObjectOutputStream(baos);
            oos.writeObject(ser);
            oos.close();
            int size = (baos.size()) / 1000000;
            System.out.println("Size: " + size + "MB");
            System.out.println("Num of Parameters: " + pc.allParams().size());
        } catch (IOException e) {
            e.printStackTrace();
        }

        System.out.println("Type Inference Service successfully started.");
        System.out.println("Current working directory: " + workDir);

        var parserNotEntered = true;
        //initialized to default parser
        Path parserPath = api.joinPath(api.pwd(), "scripts/ts/parsingFromFile.js");
        while (parserNotEntered) {
            System.out.println("Enter parser path: ");
            try {
                String line = myObj.nextLine();
                if (!line.isEmpty()) {
                    parserPath = api.joinPath(api.pwd(), line);
                    parserNotEntered = false;
                }
            } catch (Exception e) {
                System.out.println("Got exception: ${e.getMessage}");
                e.printStackTrace(System.out);
            }
        }


        System.out.println("Enter project path: ");
        System.out.flush();
        var line = api.readLine();
        try {
            assert !line.strip().isEmpty() : "Specified path should not be empty.";
            var sourcePath = line.startsWith("/") ?
                    api.absPath(line) :
                    api.joinPath(workDir, line);
            String[] skipSet = {"node_modules"};
            var results =
                    predService.predictOnProject(sourcePath, parserPath, false, skipSet);
            new TypeInferenceService.PredictionResults(results).prettyPrint();
            System.out.println("DONE");
            return;
        } catch (Throwable e) {
            System.out.println("Got exception: " + e.getMessage());
            e.printStackTrace();
        }
    }

}
